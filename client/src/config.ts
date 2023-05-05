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

export default config;