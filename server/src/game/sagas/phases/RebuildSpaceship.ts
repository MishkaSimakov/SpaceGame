import Actions from "@common/actions/Main";

import {put, select} from "../Effects";
import {StateGetters} from "@common/getters/State";
import {request} from "../components/Request";
import {isModule} from "@common/modules/Module";
import Spaceship from "@common/Spaceship";
import {isEvent} from "@common/events/Event";

const {
    rebuildSpaceshipRequest,
    playerRebuiltSpaceship
} = Actions;

export function* rebuildSpaceship() {
    const currentPlayer = StateGetters.currentPlayer(yield* select());

    const newPositions = yield* request(
        rebuildSpaceshipRequest(currentPlayer),
        'rebuildSpaceshipResponse'
    );

    const playerCards = [...currentPlayer.spaceship.modules, ...currentPlayer.hand]
        .filter(card => isModule(card));

    const newSpaceship = new Spaceship();
    newSpaceship.modules = newPositions.map(m => {
        const playerModule = playerCards.find(c => c.id === m.id)!;

        playerModule.x = m.position.x;
        playerModule.y = m.position.y;
        playerModule.rotation = m.rotation;

        return playerModule;
    });

    const newHand = currentPlayer.hand
        .filter(card => isEvent(card) || !newPositions.find(newCard => newCard.id === card.id))

    yield* put(playerRebuiltSpaceship(currentPlayer, newSpaceship, newHand));

    yield* put(Actions.message(currentPlayer, `перестроил свой корабль`));
}
