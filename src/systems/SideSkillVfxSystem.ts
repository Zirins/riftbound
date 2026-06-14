// src/systems/SideSkillVfxSystem.ts
// Brief visual feedback + dev logging when a hero auto-casts a side skill.

import Phaser from 'phaser';
import { UI } from '../constants/gameConfig';
import type { BattleHero, SkillCastResult } from '../types';

const SIDE_SKILL_RING_COLOR = 0x66ccff;
const SIDE_SKILL_TARGET_COLOR = 0xff8844;

export class SideSkillVfxSystem {
  private readonly tracked: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  playCastFeedback(
    hero: BattleHero,
    result: SkillCastResult,
    resolveTargetPosition: (unitId: string, side: 'hero' | 'enemy') => { x: number; y: number } | null,
  ): void {
    const skill = hero.runtimeKit.kit.sideSkills.find((entry) => entry.id === result.skillId);
    const skillName = skill?.name ?? result.skillId;

    if (import.meta.env.DEV) {
      console.info('[SideSkill]', {
        heroId: hero.heroId,
        skillId: result.skillId,
        skillName,
        targets: result.targets.map((target) => target.unitId),
        effects: result.effects.map((effect) => effect.effectType),
      });
      // #region agent log
      fetch('http://127.0.0.1:7764/ingest/39ea4d96-09a5-471d-9f43-5260085e1ae8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d07587'},body:JSON.stringify({sessionId:'d07587',location:'SideSkillVfxSystem.ts:playCastFeedback',message:'side skill cast',data:{heroId:hero.heroId,sceneKey:this.scene.scene.key,sceneActive:this.scene.scene.isActive(),sceneVisible:this.scene.scene.isVisible()},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }

    const casterRing = this.scene.add.circle(hero.x, hero.y, hero.radius + 6, SIDE_SKILL_RING_COLOR, 0.45);
    casterRing.setStrokeStyle(3, SIDE_SKILL_RING_COLOR, 1);
    casterRing.setDepth(UI.ULTIMATE_VFX_DEPTH);
    this.tracked.push(casterRing);
    this.scene.tweens.add({
      targets: casterRing,
      radius: hero.radius * 2.2,
      alpha: 0,
      duration: 360,
      onComplete: () => {
        casterRing.destroy();
        this.removeTracked(casterRing);
      },
    });

    const casterLabel = this.scene.add.text(hero.x, hero.y - hero.radius - 14, skillName, {
      fontSize: '10px',
      color: '#aaddff',
      fontFamily: 'monospace',
      backgroundColor: '#223344aa',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1);
    casterLabel.setDepth(UI.ULTIMATE_VFX_DEPTH + 1);
    this.tracked.push(casterLabel);
    this.scene.tweens.add({
      targets: casterLabel,
      y: casterLabel.y - 18,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        casterLabel.destroy();
        this.removeTracked(casterLabel);
      },
    });

    for (const target of result.targets) {
      const position = resolveTargetPosition(target.unitId, target.side);
      if (!position) continue;

      const flash = this.scene.add.circle(position.x, position.y, 16, SIDE_SKILL_TARGET_COLOR, 0.55);
      flash.setDepth(UI.ULTIMATE_VFX_DEPTH);
      this.tracked.push(flash);
      this.scene.tweens.add({
        targets: flash,
        radius: 30,
        alpha: 0,
        duration: 320,
        onComplete: () => {
          flash.destroy();
          this.removeTracked(flash);
        },
      });
    }
  }

  destroy(): void {
    for (const object of this.tracked) {
      object.destroy();
    }
    this.tracked.length = 0;
  }

  private removeTracked(object: Phaser.GameObjects.GameObject): void {
    const index = this.tracked.indexOf(object);
    if (index >= 0) this.tracked.splice(index, 1);
  }
}
