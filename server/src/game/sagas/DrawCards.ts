import Game from "../Game";
import {Event} from "../../../../common/events/Event";
import {MainModuleType} from "../../../../common/modules/MainModule";
import performEvent from "../EventsPerformManager";

export const drawCards = async (game: Game) => {
    console.log("   Player asked to choose card type");

    const cardType: string = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardType');
    console.log(`   Player choose ${cardType} card`);

    console.log(cardType, cardType === 'event', cardType === 'module');

    if (cardType === 'event') {
        let event: Event;
        let drawAnother: boolean;

        do {
            drawAnother = false;

            event = game.gameData.popEventCards()[0];

            await game.showCardsToPlayer([event], game.currentPlayer, true);

            console.log(`   Player get event card: ${event.description.replace("\n", " ")}`);

            if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAnotherEventCard
                && game.currentPlayer.energy >= game.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE) {
                const drawAnotherEventCard: boolean = await game.emitToCurrentPlayerAndWaitAcknowledgment('drawAnotherEventCard');
                if (drawAnotherEventCard) {
                    game.currentPlayer.energy -= game.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE;

                    game.gameData.discardCards([event]);
                    drawAnother = true;

                    console.log(`   Player draw another event card`);
                }
            }
        } while (drawAnother);

        console.log(`   Performing event`);

        await performEvent(event, game);

        console.log(`   Event performed`);
    } else if (cardType === 'module') {
        // TODO: do later
        let drawAdditional: boolean;

        do {
            drawAdditional = false;
            let module = game.gameData.popModuleCards(1)[0];

            console.log(`   Player get module: ${module.name}`);

            await game.showCardsToPlayer([module], game.currentPlayer, true);

            game.currentPlayer.hand.push(module);

            if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAdditionalModuleCard
                && game.currentPlayer.energy >= game.ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE) {
                const drawAdditionalModuleCard: boolean = await game.emitToCurrentPlayerAndWaitAcknowledgment('drawAdditionalModuleCard');
                if (drawAdditionalModuleCard) {

                    game.currentPlayer.energy -= game.ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE;
                    drawAdditional = true;

                    console.log(`   Player draw additional module card`);
                }
            }
        } while (drawAdditional);
    }

    game.changePlayerData(game.currentPlayer);
}
