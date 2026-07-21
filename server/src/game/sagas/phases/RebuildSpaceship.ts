import * as assert from "node:assert";

import {StateGetters} from "@common/getters/State";
import {message, playerRebuiltSpaceship, rebuildSpaceshipRequest} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {requestWithCheats} from "@src/game/sagas/components/RequestWithCheats";

export function* rebuildSpaceship() {
    let currentPlayer = StateGetters.currentPlayer(yield* select());

    const {state, response} = yield* requestWithCheats(
        rebuildSpaceshipRequest(currentPlayer.id),
        'rebuildSpaceshipResponse'
    );

    // update state after cheats
    currentPlayer = StateGetters.currentPlayer(state);

    const handModules = currentPlayer.hand
        .filter(card => card.cardType === "module")
        .map(card => card.module);

    const playerModules = [...currentPlayer.spaceship.modules, ...handModules];

    const newModules = response.newSpaceship.map(m => {
        const playerModule = playerModules.find(c => c.id === m.id);
        assert.ok(playerModule);

        playerModule.x = m.position.x;
        playerModule.y = m.position.y;
        playerModule.rotation = m.rotation;

        return playerModule;
    });

    const newHand = currentPlayer.hand
        .filter(card => card.cardType === "event" || !response.newSpaceship.find(newCard => newCard.id === card.module.id));

    yield* put(playerRebuiltSpaceship(currentPlayer.id, {modules: newModules}, newHand));

    yield* put(message(currentPlayer.id, `перестроил свой корабль`));
}
