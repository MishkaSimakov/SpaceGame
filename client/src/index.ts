import Game from "./Game";

async function loadFont(name, url) {
    return new Promise((resolve, reject) => {
        let newFont = new FontFace(name, `url(${url})`);
        newFont.load().then((loaded) => {
            document.fonts.add(loaded);

            resolve(loaded);
        }).catch(reject);
    });
}

async function waitDOMLoad() {
    if (document.readyState === "complete") {
        return;
    }

    return new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
    });
}

Promise.all([
    loadFont("Exo2Bold", "/fonts/Exo2-Bold.ttf"),
    loadFont("Exo2Regular", "/fonts/Exo2-Regular.ttf"),
    waitDOMLoad()
]).then(() => {
    let game = new Game();
});
