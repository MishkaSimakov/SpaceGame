let config = {
    type: Phaser.WEBGL,
    scale: {
        mode: Phaser.Scale.NONE,
        width: window.innerWidth,
        height: window.innerHeight,
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