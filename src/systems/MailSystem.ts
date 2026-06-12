// src/systems/MailSystem.ts
// System mail delivery and attachment claims.

import type { MailMessage } from '../types';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

const WELCOME_MAIL_ID = 'welcome_mail';

export function sendWelcomeMail(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;
  if (realm.mail.some((m) => m.id === WELCOME_MAIL_ID)) return;

  const welcomeMail: MailMessage = {
    id: WELCOME_MAIL_ID,
    fromName: 'Argent Trial Order',
    subject: 'Welcome to Rift City, Relic Bearer',
    body: 'Your assignment begins. The Rift gates are active along the eastern border. Supplies enclosed — use them well.',
    attachments: [{ type: 'crystals', amount: 300 }],
    isRead: false,
    isClaimed: false,
    sentAt: Date.now(),
    expiresAt: null,
  };

  saveCurrentRealm({
    ...realm,
    mail: [welcomeMail, ...realm.mail],
  });
}

export function claimAttachments(mailId: string): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const mailIndex = realm.mail.findIndex((m) => m.id === mailId);
  if (mailIndex < 0) return;

  const mail = realm.mail[mailIndex];
  if (mail.isClaimed || mail.attachments.length === 0) return;

  const grants = mail.attachments
    .map((attachment) => toCurrencyGrant(attachment))
    .filter((grant): grant is Economy.CurrencyGrant => grant !== null);

  if (grants.length > 0) {
    Economy.grantMultiple(grants);
  }

  const updatedRealm = loadCurrentRealm();
  if (!updatedRealm) return;

  const updatedMail = updatedRealm.mail.map((m) => (
    m.id === mailId
      ? { ...m, isRead: true, isClaimed: true }
      : m
  ));

  saveCurrentRealm({ ...updatedRealm, mail: updatedMail });
}

export function getUnclaimedCount(): number {
  const realm = loadCurrentRealm();
  if (!realm) return 0;

  return realm.mail.filter(
    (m) => m.attachments.length > 0 && !m.isClaimed,
  ).length;
}

function toCurrencyGrant(
  attachment: MailMessage['attachments'][number],
): Economy.CurrencyGrant | null {
  switch (attachment.type) {
    case 'gold':
      return { type: 'gold', amount: attachment.amount };
    case 'crystals':
      return { type: 'crystals', amount: attachment.amount };
    case 'xpFragments':
      return { type: 'xpFragments', amount: attachment.amount };
    case 'energy':
      return { type: 'energy', amount: attachment.amount };
    case 'shards':
      return null;
  }
}
