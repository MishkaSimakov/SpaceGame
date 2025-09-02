import {StateGetters} from "@common/getters/State";
import {message, playerRebuiltSpaceship, rebuildSpaceshipRequest} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {request} from "../components/Request";

export function* rebuildSpaceship() {
    const currentPlayer = StateGetters.currentPlayer(yield* select());

    const {newSpaceship} = yield* request(
        rebuildSpaceshipRequest(currentPlayer.id),
        'rebuildSpaceshipResponse'
    );

    const handModules = currentPlayer.hand
        .filter(card => card.cardType === "module")
        .map(card => card.module);

    const playerModules = [...currentPlayer.spaceship.modules, ...handModules];

    const newModules = newSpaceship.map(m => {
        const playerModule = playerModules.find(c => c.id === m.id)!;

        playerModule.x = m.position.x;
        playerModule.y = m.position.y;
        playerModule.rotation = m.rotation;

        return playerModule;
    });

    const newHand = currentPlayer.hand
        .filter(card => card.cardType === "event" || !newSpaceship.find(newCard => newCard.id === card.module.id))

    yield* put(playerRebuiltSpaceship(currentPlayer.id, {modules: newModules}, newHand));

    yield* put(message(currentPlayer.id, `перестроил свой корабль`));
}
