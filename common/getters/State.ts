import Player, {PlayerId} from "../Player";
import GameState from "../../server/src/game/InitGameState";

export const StateGetters = {
    playerById(state: GameState, id: PlayerId): Player | undefined {
        return state.players.find(p => p.id === id);
    },

    currentPlayer(state: GameState): Player {
        return this.playerById(state, state.currentPlayerId)!;
    },

    getPlayerIndexByOffset(state: GameState, offset: number): number {
        let currentPlayerIndex = state.players.findIndex(p => p.id === state.currentPlayerId);
        const playersCount = state.players.length;

        do {
            currentPlayerIndex = (currentPlayerIndex + Math.sign(offset) + playersCount) % playersCount;

            if (!state.players[currentPlayerIndex].lose) {
                offset += -Math.sign(offset);
            }
        } while (offset !== 0);

        return currentPlayerIndex;
    }
};