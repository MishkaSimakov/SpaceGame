import {shuffleArray} from "./Random";
import {put, select} from "../../Effects";
import {initGameState} from "@common/actions/Reducer";

export function* init() {
    const state = yield* select();

    console.log(state.mainModules.length);

    yield* shuffleArray(state.stack.module);
    yield* shuffleArray(state.stack.event);
    yield* shuffleArray(state.mainModules);
    yield* shuffleArray(state.players);

    for (const player of state.players) {
        player.hand = state.stack.module.splice(0, state.settings.startCardsCount);

        player.time = state.settings.timeControlSettings.startTime;

        // initialize spaceship
        const mainModule = state.mainModules.pop();
        mainModule.x = 0;
        mainModule.y = 0;

        player.spaceship.modules.push(mainModule);
    }

    yield* put(initGameState(state));
}