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

function redirectToLobby() {
    location.href = '/spaceships/lobby';
}

loadFont("Exo2", "/spaceships/Exo2-Bold.ttf");

let regex = /spaceships\/game\/[0-9]{6}$/

if (regex.test(window.location.href)) {
    // document.addEventListener('DOMContentLoaded', () => {
    //     let ratio = 1 / window.devicePixelRatio;
    //     let appElement = document.getElementById('app');
    //     appElement.setAttribute('style',
    //         `transform: scale(${ratio}); translate: -${50 * ratio}% -${50 * ratio}%;`
    //     );
    // });

    let link = parseInt(window.location.href.split('/').pop());

    fetch('/spaceships/check/' + link)
        .then(response => {
            return response.text();
        })
        .then(text => {
            if (text === 'true') {
                let game = new Game();
            } else {
                redirectToLobby();
            }
        });


} else {
    redirectToLobby();
}