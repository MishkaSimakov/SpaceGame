import 'phaser';
import Game from "./Game";

function loadFont(name, url) {
    let newFont = new FontFace(name, `url(${url})`);
    newFont.load().then(function (loaded) {
        document.fonts.add(loaded);
    }).catch(function (error) {
        return error;
    });
}

loadFont("Exo2", "/spaceships/Exo2-Bold.ttf");

let regex = /spaceships\/game\/[0-9]{6}$/

if (regex.test(window.location.href)) {
    let game = new Game();
} else {
    window.location.href = '/spaceships/lobby';
}