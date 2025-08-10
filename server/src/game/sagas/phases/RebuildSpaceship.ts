import Actions from "@common/actions/Main";

import {put, select} from "../Effects";
import {StateGetters} from "@common/getters/State";
import {request} from "../components/Request";

const {
    rebuildSpaceshipRequest,
    playerRebuiltSpaceship
} = Actions;

export function* rebuildSpaceship() {
    const currentPlayer = StateGetters.currentPlayer(yield* select());

    const {newSpaceship, newHand} = yield* request(
        rebuildSpaceshipRequest(currentPlayer),
        'rebuildSpaceshipResponse'
    );

    yield* put(playerRebuiltSpaceship(currentPlayer, newSpaceship, newHand));
}
