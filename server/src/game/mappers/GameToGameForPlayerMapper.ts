import * as assert from "node:assert";

import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {GameForPlayerDTO, GameState, PlayerId} from "@common/Types";

import Game from "../Game";
import {getTimeDecreasingPlayerId} from "../sagas/components/Time";

function getPlayersTime(state: GameState, currentTime: number) {
    const playersTime = state.players
        .map(p => ({
            player: p.id,
            time: p.time
        }));

    const lastRecord = state.timeRecords.length > 0 ? state.timeRecords[state.timeRecords.length - 1] : undefined;

    if (!lastRecord) {
        return playersTime;
    }

    const record = playersTime.find(v => v.player === lastRecord.playerId);
    assert.ok(record);
    record.time -= (currentTime - lastRecord.time);

    return playersTime;
}

export function getDTO(game: Game, forPlayerId: PlayerId): GameForPlayerDTO {
    const forPlayer = game.getPlayerById(forPlayerId);

    if (forPlayer === undefined) {
        throw new Error("Invalid player id passed into getDTO.");
    }

    return {
        isPaused: game.gameClock.isPaused(),
        currentTurnPlayerId: StateGetters.currentPlayer(game.state).id,
        player: forPlayer,

        otherPlayers: game.state.players
            .filter(p => p.id !== forPlayer.id)
            .map(PlayerGetters.forOtherPlayer),

        onlineMap: game.state.players
            .map(p => ({
                player: p.id,
                online: game.sockets.isOnline(p.id)
            })),

        settings: game.state.settings,

        timeControl: game.state.settings.timeControlSettings ? {
            timeDecreasingPlayerId: getTimeDecreasingPlayerId(game.state),
            playersTime: getPlayersTime(game.state, game.gameClock.getTime())
        } : undefined,
        messages: game.playerGameLog,
    };
}
