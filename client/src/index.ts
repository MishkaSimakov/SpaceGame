import 'phaser';
import Game from "./scenes/game";
import Controls from "./scenes/controls";
import SocketManager from "./helpers/SocketManager";

let gameScene = new Game();
let controlsScene = new Controls();

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: window.innerWidth,
        height: window.innerHeight
    },
    scene: [gameScene, controlsScene],
    fps: {
        forceSetTimeOut: true,
        target: 30
    },
};

const game = new Phaser.Game(config);

let socketManager = new SocketManager(gameScene, controlsScene);