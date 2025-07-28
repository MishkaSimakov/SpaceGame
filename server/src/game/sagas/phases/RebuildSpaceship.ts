import {all, put, select, take} from "../../Effects";
import {
    rebuildSpaceshipRequest,
    rebuildSpaceshipResponse,
    playerRebuiltSpaceship
} from "../../actions/Main";

export function* rebuildSpaceship() {
    const state = yield* select();
    const currentPlayerId = state.players[state.currentPlayerIndex].id;

    const {req, res} = yield* all({
        req: put(rebuildSpaceshipRequest(currentPlayerId)),
        res: take(rebuildSpaceshipResponse)
    });

    yield* put(playerRebuiltSpaceship(currentPlayerId, res.payload.newSpaceship, res.payload.newHand));
}
