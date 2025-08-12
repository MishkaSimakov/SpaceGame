import Game from "../Game";
import {GameForPlayerDTO} from "@common/GameForPlayerDTO";
import Player from "@common/Player";
import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {getTimeDecreasingPlayerId} from "../sagas/components/Time";
import GameState from "../GameState";

function getPlayersTime(state: GameState): Record<number, number> {
    let playersTime = Object.fromEntries(state.players.map(p => [p.id, p.time]));

    if (state.timeRecords.length === 0)
        return playersTime;

    const lastRecord = state.timeRecords[state.timeRecords.length - 1];
    const currentTime = (new Date()).getTime();

    playersTime[lastRecord.playerId] -= (currentTime - lastRecord.time)

    return playersTime;
}

export const getDTO = (game: Game, forPlayer: Player): GameForPlayerDTO => {
    return {
        currentTurnPlayerId: StateGetters.currentPlayer(game.state).id,
        player: game.getPlayerById(forPlayer.id),

        otherPlayers: game.state.players
            .filter(p => p.id !== forPlayer.id)
            .map(PlayerGetters.forOtherPlayer),

        onlineMap: Object.fromEntries(
            game.state.players
                .map(p => [p.id, game.sockets.isOnline(p.id)])
        ),

        settings: game.state.settings,

        timeControl: game.state.settings.timeControlSettings ? {
            timeDecreasingPlayerId: getTimeDecreasingPlayerId(game.state),
            playersTime: getPlayersTime(game.state)
        } : undefined,
        messages: game.playerGameLog.messages,
    };
}
