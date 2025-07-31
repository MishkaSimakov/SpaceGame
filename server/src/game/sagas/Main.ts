import {put} from "../Effects";
import {beforeTurn} from "./phases/BeforeTurn";
import {drawCards} from "./phases/DrawCards";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {shiftTurnToNextPlayer} from "@common/actions/Main";
import {collectEnergy} from "./phases/CollectEnergy";
import {discardCards} from "./phases/DiscardCards";
import {attack} from "./phases/Attack";
import {fixSpaceship} from "./phases/FixSpaceship";

export function* gameSaga() {
    while (true) {
        yield* beforeTurn();
        yield* collectEnergy();
        yield* rebuildSpaceship();
        yield* drawCards();
        yield* fixSpaceship();
        yield* attack();

        yield* discardCards();

        yield* put(shiftTurnToNextPlayer());
    }
}