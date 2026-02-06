import * as assert from "node:assert";

import {StateGetters} from "@common/getters/State";
import {PlayerId, TimeRecordType} from "@common/Types";
import {playerLost, setCurrentPlayer, setPlayerSkipNextTurn} from "@common/Actions";

import {put, select} from "./runner/Effects";
import {beforeTurn} from "./phases/BeforeTurn";
import {drawCards} from "./phases/DrawCards";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {collectEnergy} from "./phases/CollectEnergy";
import {discardCards} from "./phases/DiscardCards";
import {attack} from "./phases/Attack";
import {fixSpaceship} from "./phases/FixSpaceship";
import {init} from "./components/Init";
import {addTimeRecord} from "./components/Time";
import {isAction} from "@common/ActionsHelpers";

function* shiftTurn() {
    let state = yield* select();
    let currentPlayerIndex = state.players.findIndex(p => p.id === state.currentPlayerId);

    while (true) {
        currentPlayerIndex++;
        currentPlayerIndex %= state.players.length;

        const player = state.players[currentPlayerIndex];

        if (player.skipNextTurn) {
            yield* put(setPlayerSkipNextTurn(player.id, false));
            state = yield* select(); // update state
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

        try {
            yield* playerTurn();
        } catch (error) {
            if (isAction(error)) {
                assert.equal(error.type, 'playerLost');

                const currentPlayer = StateGetters.currentPlayer(yield* select());
                const lostPlayer = StateGetters.playerById(yield* select(), error.payload.player)!;

                if (currentPlayer.id === lostPlayer.id) {
                    yield* addTimeRecord(currentPlayer.id, TimeRecordType.DEFAULT_TURN_ENDED);
                }

                if (!lostPlayer.lose) {
                    yield* put(playerLost(lostPlayer.id));
                }
            } else {
                throw error;
            }
        }

        if (StateGetters.isGameEnded(yield* select())) {
            return;
        }
    }
}