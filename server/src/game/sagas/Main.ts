import {put, SagaGenerator} from "../Effects";
import {beforeTurn} from "./phases/BeforeTurn";
import {drawCards} from "./phases/DrawCards";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {shiftTurnToNextPlayer} from "../actions/Main";
import {collectEnergy} from "./phases/CollectEnergy";
import {discardCards} from "./phases/DiscardCards";

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