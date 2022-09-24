import 'phaser';
import Game from "./scenes/game";
import Controls from "./scenes/controls";
import Menu from "./scenes/menu";
import SocketManager from "./helpers/SocketManager";


let config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: window.innerWidth,
        height: window.innerHeight
    },
    parent: 'app',
    dom: {
        createContainer: true
    },
    scene: [],
    fps: {
        forceSetTimeOut: true,
        target: 30
    },
};

let regex = new RegExp('http:\\/\\/localhost:3000\\/game\\/[0-9]{6}$');

if (regex.test(window.location.href)) {
    let gameScene = new Game();
    let controlsScene = new Controls();

    config.scene.push(gameScene);
    config.scene.push(controlsScene);

    const game = new Phaser.Game(config);

    game.events.once('ready', () => {
        let socketManager = new SocketManager(gameScene, controlsScene);
    });
} else if (window.location.href === 'http://localhost:3000/') {
    let menuScene = new Menu();

    config.scene.push(menuScene);

    const game = new Phaser.Game(config);
} else {
    window.location.href = 'http://localhost:3000';
}