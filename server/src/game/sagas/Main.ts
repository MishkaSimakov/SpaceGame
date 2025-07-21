import {SagaGenerator} from "../Effects";
import {beforeTurn} from "./BeforeTurn";
import {drawCards} from "./DrawCards";
import {rebuildSpaceship} from "./RebuildSpaceship";

export function* gameSaga() {
    yield* beforeTurn();
    yield* rebuildSpaceship();
}