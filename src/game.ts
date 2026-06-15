// src/game.ts
// Exports the Phaser.Types.Core.GameConfig for Riftbound Sigils.
// main.ts imports this and creates the Phaser.Game instance.

import Phaser from 'phaser';
import { CANVAS, UI } from './constants/gameConfig';
import { MainMenuScene } from './scenes/MainMenuScene';
import { RealmSelectScene } from './scenes/RealmSelectScene';
import { HubScene } from './scenes/HubScene';
import { RosterScene } from './scenes/RosterScene';
import { HeroDetailScene } from './scenes/HeroDetailScene';
import { CampaignScene } from './scenes/CampaignScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';
import { InventoryScene } from './scenes/InventoryScene';
import { SummonTempleScene } from './scenes/SummonTempleScene';
import { SummonResultScene } from './scenes/SummonResultScene';
import { ResonanceArenaScene } from './scenes/ResonanceArenaScene';
import { ArenaResultScene } from './scenes/ArenaResultScene';
import { FormationScene } from './scenes/FormationScene';
import { BattleScene } from './scenes/BattleScene';
import { VictoryScene } from './scenes/VictoryScene';
import { DefeatScene } from './scenes/DefeatScene';
import { SigilScene } from './scenes/SigilScene';
import { SigilUpgradeScene } from './scenes/SigilUpgradeScene';
import { VoidTrialScene } from './scenes/VoidTrialScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { CovHubScene } from './scenes/CovHubScene';
import { CovMemberScene } from './scenes/CovMemberScene';
import { CovShopScene } from './scenes/CovShopScene';
import { CovBossScene } from './scenes/CovBossScene';
import { FriendScene } from './scenes/FriendScene';
import { RiftSeasonScene } from './scenes/RiftSeasonScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  backgroundColor: `#${UI.BACKGROUND_COLOR.toString(16).padStart(6, '0')}`,
  parent: 'game-container',
  scene: [
    MainMenuScene,
    RealmSelectScene,
    HubScene,
    RosterScene,
    HeroDetailScene,
    CampaignScene,
    StageSelectScene,
    SettingsScene,
    ShopScene,
    InventoryScene,
    SummonTempleScene,
    SummonResultScene,
    ResonanceArenaScene,
    ArenaResultScene,
    FormationScene,
    BattleScene,
    VictoryScene,
    DefeatScene,
    SigilScene,
    SigilUpgradeScene,
    VoidTrialScene,
    AchievementsScene,
    CovHubScene,
    CovMemberScene,
    CovShopScene,
    CovBossScene,
    FriendScene,
    RiftSeasonScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS.WIDTH,
    height: CANVAS.HEIGHT,
    // Landscape is enforced by the 844×390 dimensions — no orientation override needed.
  },
  render: {
    antialias: false,  // pixel-perfect on mobile; enable later if art requires it
    pixelArt: false,
  },
  input: {
    activePointers: 4,  // multi-touch for simultaneous ultimate taps
  },
};
