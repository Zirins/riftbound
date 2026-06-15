// src/systems/MailSystem.ts
// System mail delivery and attachment claims.

import type { MailMessage, RealmSaveDataV3, RewardBundle } from '../types';
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

  const attachmentBundle = buildAttachmentRewardBundle(mail);
  if (attachmentBundle) {
    RewardSystem.grantRewardBundle(save, attachmentBundle);
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

export function claimAllAttachments(): number {
  const realm = loadCurrentRealm();
  if (!realm) return 0;

  const save = realm as RealmSaveDataV3;
  const claimable = save.mail.filter(
    (m) => !m.isClaimed && (m.attachments.length > 0 || m.rewardBundle !== undefined),
  );

  if (claimable.length === 0) return 0;

  for (const mail of claimable) {
    const attachmentBundle = buildAttachmentRewardBundle(mail);
    if (attachmentBundle) {
      RewardSystem.grantRewardBundle(save, attachmentBundle);
    }

    if (mail.rewardBundle) {
      RewardSystem.grantRewardBundle(save, mail.rewardBundle);
    }
  }

  const claimIds = new Set(claimable.map((m) => m.id));
  save.mail = save.mail.map((m) => (
    claimIds.has(m.id)
      ? { ...m, isRead: true, isClaimed: true }
      : m
  ));

  saveCurrentRealm(save);
  return claimable.length;
}

export function getUnclaimedCount(): number {
  const realm = loadCurrentRealm();
  if (!realm) return 0;

  return realm.mail.filter(
    (m) => (!m.isClaimed && (m.attachments.length > 0 || m.rewardBundle !== undefined)),
  ).length;
}

function buildAttachmentRewardBundle(mail: MailMessage): RewardBundle | null {
  if (mail.attachments.length === 0) return null;

  const currencies: NonNullable<RewardBundle['currencies']> = [];
  const items: NonNullable<RewardBundle['items']> = [];

  for (const attachment of mail.attachments) {
    switch (attachment.type) {
      case 'gold':
        currencies.push({ type: 'gold', amount: attachment.amount });
        break;
      case 'crystals':
        currencies.push({ type: 'rift_crystal', amount: attachment.amount });
        break;
      case 'energy':
        currencies.push({ type: 'energy', amount: attachment.amount });
        break;
      case 'xpFragments':
        items.push({ itemId: 'xp_fragment', quantity: attachment.amount });
        break;
      case 'shards':
        break;
    }
  }

  if (currencies.length === 0 && items.length === 0) return null;
  return {
    source: 'mail',
    currencies: currencies.length > 0 ? currencies : undefined,
    items: items.length > 0 ? items : undefined,
  };
}
