// let config: Phaser.Types.Core.GameConfig = {
let config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio,
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

export default config;