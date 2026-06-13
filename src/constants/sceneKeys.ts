// src/constants/sceneKeys.ts
// Scene key strings — use for navigation to avoid circular scene imports.

export const SCENE_KEYS = {
  // V0.1 scenes (preserved)
  MAIN_MENU:        'MainMenuScene',
  FORMATION:        'FormationScene',
  BATTLE:           'BattleScene',
  VICTORY:          'VictoryScene',
  DEFEAT:           'DefeatScene',

  // V1.1 new scenes
  REALM_SELECT:     'RealmSelectScene',
  HUB:              'HubScene',
  ROSTER:           'RosterScene',
  HERO_DETAIL:      'HeroDetailScene',
  SUMMON_TEMPLE:    'SummonTempleScene',
  SUMMON_RESULT:    'SummonResultScene',
  CAMPAIGN:         'CampaignScene',
  STAGE_SELECT:     'StageSelectScene',
  RESONANCE_ARENA:  'ResonanceArenaScene',
  ARENA_RESULT:     'ArenaResultScene',
  SHOP:             'ShopScene',
  SETTINGS:         'SettingsScene',

  // V2 new scenes
  SIGIL:            'SigilScene',
  SIGIL_UPGRADE:    'SigilUpgradeScene',
  ACHIEVEMENTS:     'AchievementsScene',
  INVENTORY:        'InventoryScene',
  VOID_TRIAL:       'VoidTrialScene',
  COVENANT_HUB:     'CovHubScene',
  COVENANT_MEMBER:  'CovMemberScene',
  COVENANT_BOSS:    'CovBossScene',
  COVENANT_SHOP:    'CovShopScene',
  FRIENDS:          'FriendScene',
  PATRON:           'PatronScene',
  RIFT_SEASON:      'RiftSeasonScene',
} as const;

export type SceneKey = typeof SCENE_KEYS[keyof typeof SCENE_KEYS];
