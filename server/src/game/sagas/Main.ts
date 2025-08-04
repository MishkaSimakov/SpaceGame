import {put, select} from "../Effects";
import {beforeTurn} from "./phases/BeforeTurn";
import {drawCards} from "./phases/DrawCards";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {shiftTurnToNextPlayer} from "@common/actions/Main";
import {collectEnergy} from "./phases/CollectEnergy";
import {discardCards} from "./phases/DiscardCards";
import {attack} from "./phases/Attack";
import {fixSpaceship} from "./phases/FixSpaceship";
import {init} from "./components/Init";
import {StateGetters} from "@common/getters/State";

function* isCurrentPlayerLost() {
    return StateGetters.currentPlayer(yield* select()).lose;
}

function* isGameEnded() {
    return (yield* select()).players.filter(p => !p.lose).length === 1;
}

function* playerTurn() {
    // after moving damage player can potentially lose
    yield* beforeTurn();
    if (yield* isCurrentPlayerLost()) {
        return;
    }

    yield* collectEnergy();
    yield* rebuildSpaceship();

    yield* drawCards();
    if (yield* isCurrentPlayerLost()) {
        return;
    }

    yield* fixSpaceship();

    yield* attack();
    if (yield* isCurrentPlayerLost()) {
        return;
    }

    yield* discardCards();
}

export function* gameSaga() {
    yield* init();

    while (true) {
        yield* playerTurn();

        if (yield* isGameEnded()) {
            return;
        }

        yield* put(shiftTurnToNextPlayer());
    }
}