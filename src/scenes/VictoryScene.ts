// src/scenes/VictoryScene.ts
// V0.1: Reward summary, Continue button.

import Phaser from 'phaser';
import { CANVAS, STAGES, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';

export class VictoryScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.VICTORY;

  private titleLabel!: Phaser.GameObjects.Text;
  private stageLabel!: Phaser.GameObjects.Text;
  private rewardLabel!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private continueTapZone!: Phaser.GameObjects.Zone;

  constructor() {
    super({ key: VictoryScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 70,
      'VICTORY',
      {
        fontSize: '36px',
        color: '#ffee44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.stageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 20,
      STAGES.STAGE_1.DISPLAY_NAME,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    // TODO(v1.1): wire to currency system — hardcoded V0.1 reward only
    this.rewardLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 20,
      'Gold: 500',
      {
        fontSize: '18px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    const continueY = CANVAS.HEIGHT / 2 + 70;
    this.continueButton = this.add.text(
      CANVAS.WIDTH / 2,
      continueY,
      '[ CONTINUE ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.continueTapZone = this.add.zone(
      CANVAS.WIDTH / 2,
      continueY,
      UI.SCENE_NAV_BUTTON_WIDTH,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    this.continueTapZone.setInteractive({ useHandCursor: true });
    this.continueTapZone.on('pointerup', this.onContinue, this);

    // #region agent log
    fetch('http://127.0.0.1:7764/ingest/39ea4d96-09a5-471d-9f43-5260085e1ae8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d07587'},body:JSON.stringify({sessionId:'d07587',runId:'post-fix',location:'VictoryScene.ts:create',message:'VictoryScene create',data:{mainMenuKey:SCENE_KEYS.MAIN_MENU},hypothesisId:'B,E',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  shutdown(): void {
    this.continueTapZone?.off('pointerup', this.onContinue, this);
    this.continueTapZone?.destroy();
    this.titleLabel?.destroy();
    this.stageLabel?.destroy();
    this.rewardLabel?.destroy();
    this.continueButton?.destroy();
  }

  private readonly onContinue = (): void => {
    const targetKey = SCENE_KEYS.MAIN_MENU;
    const hasTarget = Boolean(this.scene.get(targetKey));
    // #region agent log
    fetch('http://127.0.0.1:7764/ingest/39ea4d96-09a5-471d-9f43-5260085e1ae8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d07587'},body:JSON.stringify({sessionId:'d07587',runId:'post-fix',location:'VictoryScene.ts:onContinue',message:'onContinue handler fired',data:{targetKey,hasTarget},hypothesisId:'A,B,E',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    this.scene.start(targetKey);
  };
}
