import 'phaser';
import Game from "./scenes/game";
import Controls from "./scenes/controls";
import SocketManager from "./helpers/SocketManager";

let bus = new Phaser.Events.EventEmitter();

let gameScene = new Game(bus);
let controlsScene = new Controls(bus);

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