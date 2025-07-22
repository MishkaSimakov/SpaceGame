import {all, put, select, take} from "../Effects";
import {
    rebuildSpaceshipRequest,
    rebuildSpaceshipResponse,
    playerRebuiltSpaceship
} from "../actions/Actions";

export function* rebuildSpaceship() {
    const state = yield* select();
    const currentPlayerId = state.players[state.currentPlayerIndex].id;

    const {req, res} = yield* all({
        req: put(rebuildSpaceshipRequest(currentPlayerId)),
        res: take(rebuildSpaceshipResponse)
    });

    console.log(res);
    yield* put(playerRebuiltSpaceship(currentPlayerId, res.payload.newSpaceship, res.payload.newHand));
}
