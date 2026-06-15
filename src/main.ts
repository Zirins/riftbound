// src/main.ts
// Entry point — creates the Phaser.Game instance.
//
// Capacitor Android shell loads this bundle from dist/ via capacitor.config.ts.
// Optional @capacitor/app pause/resume listeners can be added post-MVP.

import Phaser from 'phaser';
import { gameConfig } from './game';
import { AchievementSystem } from './systems/AchievementSystem';
import { WeeklyTaskSystem } from './systems/WeeklyTaskSystem';

AchievementSystem.init();
WeeklyTaskSystem.init();

if (import.meta.env.DEV) {
  void import('./dev/phase7CombatHarness').then((module) => {
    module.exposePhase7CombatHarness();
  });
  void import('./dev/phase9AwakeningHarness').then((module) => {
    module.exposePhase9AwakeningHarness();
  });
  void import('./dev/phase10SigilHarness').then((module) => {
    module.exposePhase10SigilHarness();
  });
  void import('./dev/phase12BondHarness').then((module) => {
    module.exposePhase12BondHarness();
  });
  void import('./dev/phase14CampaignHarness').then((module) => {
    module.exposePhase14CampaignHarness();
  });
  void import('./dev/phase16VoidTrialHarness').then((module) => {
    module.exposePhase16VoidTrialHarness();
  });
  void import('./dev/phase17OfflineRewardHarness').then((module) => {
    module.exposePhase17OfflineRewardHarness();
  });
  void import('./dev/phase18AchievementHarness').then((module) => {
    module.exposePhase18AchievementHarness();
  });
  void import('./dev/phase19WeeklyTaskHarness').then((module) => {
    module.exposePhase19WeeklyTaskHarness();
  });
  void import('./dev/phase20CovenantHarness').then((module) => {
    module.exposePhase20CovenantHarness();
  });
  void import('./dev/phase22CovShopHarness').then((module) => {
    module.exposePhase22CovShopHarness();
  });
  void import('./dev/phase23CovBossHarness').then((module) => {
    module.exposePhase23CovBossHarness();
  });
}

new Phaser.Game(gameConfig);
