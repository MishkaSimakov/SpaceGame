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

loadFont("Exo2Bold", "/fonts/Exo2-Bold.ttf");
loadFont("Exo2Regular", "/fonts/Exo2-Regular.ttf");

// document.addEventListener('DOMContentLoaded', () => {
//     let ratio = 1 / window.devicePixelRatio;
//     let appElement = document.getElementById('app');
//     appElement.setAttribute('style',
//         `transform: scale(${ratio}); translate: -${50 * ratio}% -${50 * ratio}%;`
//     );
// });

let game = new Game();
