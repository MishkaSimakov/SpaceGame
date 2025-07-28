import Player, {PlayerId} from "../Player";
import GameState from "../../server/src/game/GameState";

export const StateGetters = {
    playerById(state: GameState, id: PlayerId): Player | undefined {
        return state.players.find(p => p.id === id);
    },

    currentPlayer(state: GameState): Player {
        return state.players[state.currentPlayerIndex];
    },

    getPlayerIndexByOffset(state: GameState, offset: number): number {
        let currentPlayerIndex = state.currentPlayerIndex;
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