import Game from "../../server/src/game/Game";
import Game2 from "../../client/src/graphics/scenes/game/spaceships";

export default class PutTopThreeCardsInAnyOrderEvent {
    public description: string;
    public clientListeners: [() => void]
    private game: Game;
    private game2: Game2;


    constructor(game: Game) {
        this.game = game;
        this.description = "Положите верхние три карты строительства в произвольном порядке";
    }

    performOnServer() {

    }
}