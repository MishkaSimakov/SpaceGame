import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {GameForPlayerDTO, GameState, Player} from "@common/Types";

import Game from "../Game";
import {getTimeDecreasingPlayerId} from "../sagas/components/Time";

function getPlayersTime(state: GameState, currentTime: number) {
    const playersTime = state.players
        .map(p => ({
            player: p.id,
            time: p.time
        }));

    if (state.timeRecords.length === 0) {
        return playersTime;
    }

    const lastRecord = state.timeRecords[state.timeRecords.length - 1];

    const record = playersTime.find(v => v.player === lastRecord.playerId)!;
    record.time -= (currentTime - lastRecord.time);

    return playersTime;
}

export function getDTO(game: Game, forPlayer: Player): GameForPlayerDTO {
    return {
        isPaused: game.gameClock.isPaused(),
        currentTurnPlayerId: StateGetters.currentPlayer(game.state).id,
        player: game.getPlayerById(forPlayer.id),

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
