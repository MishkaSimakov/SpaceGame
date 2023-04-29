import BaseListener from "./BaseListener";
import Game from "../scenes/game";
import Controls from "../scenes/controls";
import {Socket} from "socket.io-client";
import Module, {isModule} from "../../../common/modules/Module";
import {Event} from "../../../common/events/Event";

export default class EventCardsListener extends BaseListener {
    controls: Controls;
    game: Game;
    socket: Socket;
    link: number;

    constructor(...args: ConstructorParameters<typeof BaseListener>) {
        super(...args);
    }

    //  permuteThreeCards
    //  permuteThreeCardsAndChooseOne
    //  destroyAnyModuleOnYourSpaceshipEvent
    //  destroyTwoSolarPanelsOnYourSpaceshipEvent
    //  choosePlayerForAttack
    //  chooseModuleToDamageEvent
    //  chooseModuleToRepairEvent
    //  --choosePlayerToStealCardEvent
    //  --chooseCardOfPlayer
    //  chooseCardsForRepairSpaceshipEvent
    //  chooseModulesToRepairByDiscardedCards
    //  chooseModulesToMoveDamage
    //  --chooseCardsToDiscardAndTakeAnother
    addListeners(): void {
        this.socket.on('choosePlayerToStealCardEvent', (playersWithCards: number[], callback: (link: number) => void) => {
            this.controls.setStatus("Choose player");

            this.controls.chooseFromList("Choose player", playersWithCards.map(v => v.toString())).then((index: number) => {
                callback(playersWithCards[index]);
            });
        });

        this.socket.on('chooseCardOfPlayer', (cards: (Module | Event)[], callback: (cardIndex: number) => void) => {
            this.controls.setStatus("Choose card");

            this.controls.chooseFromList("Choose card", cards.map((card: Module | Event): string => {
                if (isModule(card)) {
                    return (card as Module).name;
                } else {
                    return (card as Event).description;
                }
            })).then((cardIndex: number) => {
                callback(cardIndex);
            });
        });

        this.socket.on('chooseCardsToDiscardAndTakeAnother', (cards: (Module | Event)[], callback: (indexes: number[]) => void) => {
            this.controls.setStatus("Choose up to 2 cards");

            this.controls.chooseCards(cards, 2).then((indexes: number[]) => {
                callback(indexes);
            });
        });
    }
}