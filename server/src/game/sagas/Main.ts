import {StateGetters} from "@common/getters/State";
import {TimeRecordType} from "@common/Types";
import {setCurrentPlayer} from "@common/Actions";

import {newTask, put, select} from "./runner/Effects";
import {beforeTurn} from "./phases/BeforeTurn";
import {drawCards} from "./phases/DrawCards";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {collectEnergy} from "./phases/CollectEnergy";
import {discardCards} from "./phases/DiscardCards";
import {attack} from "./phases/Attack";
import {fixSpaceship} from "./phases/FixSpaceship";
import {init} from "./components/Init";
import {addTimeRecord} from "./components/Time";

function* isGameEnded() {
    return (yield* select()).players.filter(p => !p.lose).length === 1;
}

function* shiftTurn() {
    const state = yield* select();
    let currentPlayerIndex = state.players.findIndex(p => p.id === state.currentPlayerId);

    while (true) {
        currentPlayerIndex++;
        currentPlayerIndex %= state.players.length;

        const player = state.players[currentPlayerIndex];

        if (player.skipNextTurn) {
            player.skipNextTurn = false;
            continue;
        }

        if (player.lose) {
            continue;
        }

        break;
    }

    yield* put(setCurrentPlayer(state.players[currentPlayerIndex].id));
}

function* playerTurn() {
    const currentPlayer = StateGetters.currentPlayer(yield* select());
    yield* addTimeRecord(currentPlayer.id, TimeRecordType.DEFAULT_TURN_STARTED);

    // after moving damage player can potentially lose
    yield* beforeTurn();
    yield* collectEnergy();
    yield* rebuildSpaceship();
    yield* drawCards();
    yield* fixSpaceship();
    yield* attack();
    yield* discardCards();

    yield* addTimeRecord(currentPlayer.id, TimeRecordType.DEFAULT_TURN_ENDED);
}

export function* gameSaga() {
    yield* init();

    while (true) {
        yield* shiftTurn();

        yield* newTask(playerTurn);

        if (yield* isGameEnded()) {
            return;
        }
    }
}