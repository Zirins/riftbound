// src/data/npcFriends.ts
// Seeded NPC friend pool for V2 Friend System (Section 28.1).

export interface NpcFriendProfile {
  id: string;
  name: string;
  title: string;
  flavorText: string;
  lastActiveText: string;
}

export const NPC_FRIENDS: NpcFriendProfile[] = [
  {
    id: 'npc_friend_yunxi',
    name: 'Yun Xi',
    title: 'Rift Disciple',
    flavorText: 'Trains at the eastern gate each dawn, trading cultivation tips for spare energy.',
    lastActiveText: '1h ago',
  },
  {
    id: 'npc_friend_lianmei',
    name: 'Lian Mei',
    title: 'Moonveil Healer',
    flavorText: 'Brews spirit teas that restore vigor — she always saves a cup for allies.',
    lastActiveText: '30m ago',
  },
  {
    id: 'npc_friend_zhao_feng',
    name: 'Zhao Feng',
    title: 'Iron Meridian Guard',
    flavorText: 'Patrols the caravan roads. Sends energy crystals to friends before long watches.',
    lastActiveText: '3h ago',
  },
  {
    id: 'npc_friend_su_qing',
    name: 'Su Qing',
    title: 'Void Script Scribe',
    flavorText: 'Catalogues rift anomalies. Gifts feel like annotated margin notes — brief but potent.',
    lastActiveText: '5h ago',
  },
  {
    id: 'npc_friend_han_rui',
    name: 'Han Rui',
    title: 'Ember Sect Acolyte',
    flavorText: 'Still learning flame control. Shares cultivation fuel to repay training partners.',
    lastActiveText: '12h ago',
  },
  {
    id: 'npc_friend_ning_shu',
    name: 'Ning Shu',
    title: 'Spirit Beast Tamer',
    flavorText: 'Her void-touched hound sniffs out ley lines. She passes along the surplus charge.',
    lastActiveText: '2h ago',
  },
  {
    id: 'npc_friend_chen_wei',
    name: 'Chen Wei',
    title: 'Wandering Spearman',
    flavorText: 'Duels corrupted cultivators along the border. Never forgets a sparring partner.',
    lastActiveText: '1d ago',
  },
  {
    id: 'npc_friend_xia_lan',
    name: 'Xia Lan',
    title: 'Frost Pavilion Adept',
    flavorText: 'Condenses rift mist into spirit water. A daily flask for close friends.',
    lastActiveText: '4h ago',
  },
  {
    id: 'npc_friend_mu_dan',
    name: 'Mu Dan',
    title: 'Alchemy Hall Apprentice',
    flavorText: 'Tests stamina elixirs on herself first — then ships the stable batches to friends.',
    lastActiveText: '6h ago',
  },
  {
    id: 'npc_friend_gu_heng',
    name: 'Gu Heng',
    title: 'Starfall Observer',
    flavorText: 'Charts cosmic tides above Rift City. Energy gifts arrive like punctual meteors.',
    lastActiveText: '8h ago',
  },
  {
    id: 'npc_friend_pei_ran',
    name: 'Pei Ran',
    title: 'Shadow Meridian Rogue',
    flavorText: 'Operates in grey markets. Pays debts in friendship and five-point spirit charges.',
    lastActiveText: '45m ago',
  },
  {
    id: 'npc_friend_tao_lin',
    name: 'Tao Lin',
    title: 'Jade Archive Keeper',
    flavorText: 'Maintains sect records. Sends energy so allies can finish late-night research.',
    lastActiveText: '2d ago',
  },
  {
    id: 'npc_friend_fei_yan',
    name: 'Fei Yan',
    title: 'Thunder Vein Cultivator',
    flavorText: 'Channels lightning through meridians. Surplus spark gets packaged for friends.',
    lastActiveText: '7h ago',
  },
  {
    id: 'npc_friend_lu_ming',
    name: 'Lu Ming',
    title: 'Rift Ferry Pilot',
    flavorText: 'Guides caravans through unstable gates. Shares route stamina with trusted companions.',
    lastActiveText: '10h ago',
  },
  {
    id: 'npc_friend_qin_yue',
    name: 'Qin Yue',
    title: 'Spirit Silk Weaver',
    flavorText: 'Embroiders sigil thread by moonlight. Gifts arrive wrapped in protective wards.',
    lastActiveText: '18h ago',
  },
  {
    id: 'npc_friend_bai_zhou',
    name: 'Bai Zhou',
    title: 'Celestial Quarter Merchant',
    flavorText: 'Trades void herbs for favors. Energy gifts keep his best customers loyal.',
    lastActiveText: '3h ago',
  },
  {
    id: 'npc_friend_rong_hui',
    name: 'Rong Hui',
    title: 'Corrupted Cult Hunter',
    flavorText: 'Tracks fallen cultivators into the wastes. Allies fuel her long pursuit nights.',
    lastActiveText: '1h ago',
  },
  {
    id: 'npc_friend_shen_an',
    name: 'Shen An',
    title: 'Quiet Peak Hermit',
    flavorText: 'Meditates atop a ley spire. Rarely speaks — but always sends energy at sunrise.',
    lastActiveText: '20h ago',
  },
  {
    id: 'npc_friend_jia_ling',
    name: 'Jia Ling',
    title: 'Rift Wraith Binder',
    flavorText: 'Seals wandering spirits. Channels reclaimed essence to friends as daily gifts.',
    lastActiveText: '5h ago',
  },
  {
    id: 'npc_friend_dong_ze',
    name: 'Dong Ze',
    title: 'Argent Trial Squire',
    flavorText: 'Assists relic bearers on probation. Energy gifts are part of the trial oath.',
    lastActiveText: '2h ago',
  },
];

const FRIENDS_BY_ID = new Map(NPC_FRIENDS.map((friend) => [friend.id, friend]));

export function getNpcFriend(id: string): NpcFriendProfile | null {
  return FRIENDS_BY_ID.get(id) ?? null;
}

export function getNpcFriendIds(): string[] {
  return NPC_FRIENDS.map((friend) => friend.id);
}
