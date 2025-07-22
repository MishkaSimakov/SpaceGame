import {put, SagaGenerator} from "../Effects";
import {beforeTurn} from "./BeforeTurn";
import {drawCards} from "./DrawCards";
import {rebuildSpaceship} from "./RebuildSpaceship";
import {shiftTurnToNextPlayer} from "../actions/Actions";
import {collectEnergy} from "./CollectEnergy";

export function* gameSaga() {
    while (true) {
        yield* beforeTurn();
        yield* collectEnergy();
        yield* rebuildSpaceship();
        yield* drawCards();

        yield* put(shiftTurnToNextPlayer());
    }
}