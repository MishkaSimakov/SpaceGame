import 'phaser';
import Game from "./scenes/game";
import Controls from "./scenes/controls";

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: window.innerWidth,
        height: window.innerHeight
    },
    scene: [Game, Controls],
    fps: {
        forceSetTimeOut: true,
        target: 30
    },
};

const game = new Phaser.Game(config);