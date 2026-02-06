import Game from "../Game";
import Scene from "./engine/Scene";
import {Group} from "./engine/Group";
import {Text} from "./engine/shapes/Text";

export default class PauseDrawer {
    group: Group;
    pauseButton: Text;

    scene: Scene;
    gameManager: Game;

    constructor(game: Game, scene: Scene) {
        this.scene = scene;

        this.gameManager = game;

        this.group = this.scene.createAndAdd.group();

        this.pauseButton = new Text({
            x: 10,
            y: 10,
            text: "Пауза",
            originX: 0,
            originY: 0,
            fill: "white",
            fontFamily: "Exo2Bold",
            fontSize: 10
        }).on('click', () => {
            game.socketManager.pause();
        });

        this.group.add(this.pauseButton);
    }
}
