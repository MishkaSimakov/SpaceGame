import {put, SagaGenerator} from "../Effects";
import {beforeTurn} from "./BeforeTurn";
import {drawCards} from "./DrawCards";
import {rebuildSpaceship} from "./RebuildSpaceship";
import {shiftTurnToNextPlayer} from "../actions/Main";
import {collectEnergy} from "./CollectEnergy";
import {discardCards} from "./DiscardCards";

export function* gameSaga() {
    while (true) {
        yield* beforeTurn();
        yield* collectEnergy();
        yield* rebuildSpaceship();
        yield* drawCards();

        yield* discardCards();

        yield* put(shiftTurnToNextPlayer());
    }
}