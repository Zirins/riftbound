// src/systems/MailSystem.ts
// System mail delivery and attachment claims.

import type { MailMessage, RealmSaveDataV3, RewardBundle } from '../types';
import * as Economy from './EconomySystem';
import { RewardSystem } from './RewardSystem';
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

export interface CreateRewardMailOptions {
  fromName?: string;
  subject: string;
  body: string;
  bundle: RewardBundle;
}

/** Delivers a V2 reward bundle via mail — mutates save.mail; caller persists. */
export function createRewardMail(save: RealmSaveDataV3, options: CreateRewardMailOptions): string {
  const id = `reward_mail_${Date.now()}_${save.mail.length}`;
  const mail: MailMessage = {
    id,
    fromName: options.fromName ?? 'System Mail',
    subject: options.subject,
    body: options.body,
    attachments: [],
    rewardBundle: options.bundle,
    isRead: false,
    isClaimed: false,
    sentAt: Date.now(),
    expiresAt: null,
  };

  save.mail = [mail, ...save.mail];
  return id;
}

export function claimAttachments(mailId: string): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const mailIndex = save.mail.findIndex((m) => m.id === mailId);
  if (mailIndex < 0) return;

  const mail = save.mail[mailIndex];
  if (mail.isClaimed) return;
  if (mail.attachments.length === 0 && !mail.rewardBundle) return;

  const grants = mail.attachments
    .map((attachment) => toCurrencyGrant(attachment))
    .filter((grant): grant is Economy.CurrencyGrant => grant !== null);

  if (grants.length > 0) {
    Economy.grantMultiple(grants);
  }

  if (mail.rewardBundle) {
    RewardSystem.grantRewardBundle(save, mail.rewardBundle);
  }

  save.mail = save.mail.map((m) => (
    m.id === mailId
      ? { ...m, isRead: true, isClaimed: true }
      : m
  ));

  saveCurrentRealm(save);
}

export function getUnclaimedCount(): number {
  const realm = loadCurrentRealm();
  if (!realm) return 0;

  return realm.mail.filter(
    (m) => (!m.isClaimed && (m.attachments.length > 0 || m.rewardBundle !== undefined)),
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
