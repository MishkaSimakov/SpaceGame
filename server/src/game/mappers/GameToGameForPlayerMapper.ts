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
    let dto = new GameForPlayerDTO();

    dto.currentTurnPlayerId = StateGetters.currentPlayer(game.state).id;
    dto.player = game.getPlayerById(forPlayer.id);

    dto.otherPlayers = game.state.players
        .filter(p => p.id !== forPlayer.id)
        .map(PlayerGetters.forOtherPlayer);

    dto.onlineMap = Object.fromEntries(
        game.state.players
            .map(p => [p.id, game.sockets.isOnline(p.id)])
    );

    dto.settings = game.state.settings;

    if (game.state.settings.withTimeControl) {
        dto.timeControl = {
            timeDecreasingPlayerId: getTimeDecreasingPlayerId(game.state),
            playersTime: getPlayersTime(game.state)
        };
    }

    dto.messages = [];

    return dto;
}
