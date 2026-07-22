import * as assert from "node:assert";

import {initGameState} from "@common/Actions";
import {GameState} from "@common/Types";

import {shuffleArray} from "./Random";
import {put, select} from "../runner/Effects";

export function* init() {
    const state: GameState = yield* select();

    yield* shuffleArray(state.stack.module);
    yield* shuffleArray(state.stack.event);
    yield* shuffleArray(state.mainModulesStack);
    yield* shuffleArray(state.players);

    state.currentPlayerId = state.players[0].id;

    for (const player of state.players) {
        player.hand = state.stack.module.splice(0, state.settings.startCardsCount)
            .map(module => ({cardType: "module", module}));

        if (state.settings.timeControlSettings) {
            player.time = state.settings.timeControlSettings.startTime;
        }

        // initialize spaceship
        const mainModule = state.mainModulesStack.pop();
        assert.ok(mainModule);
        mainModule.x = 0;
        mainModule.y = 0;
        player.spaceship.modules.push(mainModule);
    }

    yield* put(initGameState(state));
}