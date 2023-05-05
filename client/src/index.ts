import 'phaser';
import Menu from "./graphics/scenes/menu";
import Game from "./Game";
import config from "./config";

let regex = new RegExp('http:\\/\\/localhost:3000\\/game\\/[0-9]{6}$');


function loadFont(name, url) {
    let newFont = new FontFace(name, `url(${url})`);
    newFont.load().then(function (loaded) {
        document.fonts.add(loaded);
    }).catch(function (error) {
        return error;
    });
}

loadFont("Exo2", "http://localhost:3000/Exo2-Bold.ttf");

if (regex.test(window.location.href)) {
    let game = new Game();
} else if (window.location.href === 'http://localhost:3000/') {
    let menuScene = new Menu();

    config.scene.push(menuScene);

    const game = new Phaser.Game(config);
} else {
    window.location.href = 'http://localhost:3000';
}