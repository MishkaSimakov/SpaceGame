import {Action} from './Action';
import Player, {PlayerId} from "@common/Player";
import {AttackReason} from "@common/Types";
import Spaceship from "@common/Spaceship";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import GameState from "../GameState";
import Vector2 from "@common/Vector2";

export const initGameState = (state: GameState) => {
    return {
        type: 'initGameState',
        payload: {state}
    };
}

export const choosePlayerForAttackRequest = (player: PlayerId, reason: AttackReason) => {
    return {
        type: 'choosePlayerForAttackRequest',
        payload: {player, reason}
    };
}

export const choosePlayerForAttackResponse = (victim: PlayerId) => {
    return {
        type: 'choosePlayerForAttackResponse',
        payload: {victim}
    };
}

export const rebuildSpaceshipRequest = (player: PlayerId) => {
    return {
        type: 'rebuildSpaceshipRequest',
        payload: {player}
    };
}

export const rebuildSpaceshipResponse = (newSpaceship: Spaceship, newHand: (Module | Event)[]) => {
    return {
        type: 'rebuildSpaceshipResponse',
        payload: {newSpaceship, newHand}
    };
}

export const disposeCardsFromPlayerHand = (player: Player, indices: number[], reason: string) => {
    return {
        type: 'disposeCardsFromPlayerHand',
        payload: {player: player.id, indices},
        meta: {reason}
    };
}

export const beginFight = (attacker: PlayerId, victim: PlayerId, reason: string) => {
    return {
        type: 'beginFight',
        payload: {attacker, victim},
        meta: {reason}
    }
}

export const playerRebuiltSpaceship = (player: PlayerId, newSpaceship: Spaceship, newHand: (Module | Event)[]) => {
    return {
        type: 'playerRebuiltSpaceship',
        payload: {player, newSpaceship, newHand}
    };
}

export const chooseCardTypeRequest = (player: PlayerId) => {
    return {
        type: 'chooseCardTypeRequest',
        payload: {player}
    };
}

export const chooseCardTypeResponse = (chosenType: "event" | "module") => {
    return {
        type: 'chooseCardTypeResponse',
        payload: {chosenType}
    };
}

export const playerDrawCardFromHeap = (player: PlayerId, card: Module | Event) => {
    return {
        type: 'playerDrawCardFromHeap',
        payload: {player, card}
    };
}

export const shiftTurnToNextPlayer = () => {
    return {type: 'shiftTurnToNextPlayer'};
}

export const changePlayerEnergy = (player: Player, delta: number, reason: string) => {
    return {
        type: 'changePlayerEnergy',
        payload: {player: player.id, delta},
        meta: {reason}
    }
}

export const showCardsToPlayersRequest = (cards: (Module | Event)[], player: Player, showToOthers: boolean) => {
    return {
        type: 'showCardsToPlayersRequest',
        payload: {cards, player: player.id, showToOthers}
    }
}

export const showCardsToPlayersResponse = () => {
    return {type: 'showCardsToPlayersResponse'};
}

export const drawAdditionalModuleCardRequest = (player: PlayerId) => {
    return {
        type: 'drawAdditionalModuleCardRequest',
        payload: {player}
    };
}

export const drawAdditionalModuleCardResponse = (draw: boolean) => {
    return {
        type: 'drawAdditionalModuleCardResponse',
        payload: draw,
    };
}

export const drawAnotherEventCardRequest = (player: PlayerId) => {
    return {
        type: 'drawAnotherEventCardRequest',
        payload: {player}
    };
}

export const drawAnotherEventCardResponse = (draw: boolean) => {
    return {
        type: 'drawAnotherEventCardResponse',
        payload: draw,
    };
}

export const returnDiscardsToStack = (type: "module" | "event", discards: (Module | Event)[]) => {
    return {
        type: 'returnDiscardsToStack',
        payload: {type, discards}
    };
}

export const reducerUpdatedState = (state: GameState) => {
    return {
        type: 'reducerUpdatedState',
        payload: {state}
    };
}

export const playerSkipNextTurn = (player: PlayerId) => {
    return {
        type: 'playerSkipNextTurn',
        payload: {player}
    };
}

export const destructSpaceshipModules = (player: Player, positions: Vector2[], cardsDestiny: "discard" | "hand") => {
    return {
        type: 'destructSpaceshipModules',
        payload: {player: player.id, positions, cardsDestiny}
    };
}

export const pushCurrentEventToPlayerHand = (player: Player) => {
    return {
        type: 'pushCurrentEventToPlayerHand',
        payload: {player: player.id}
    };
}

export const discardCardsRequest = (player: Player) => {
    return {
        type: 'discardCardsRequest',
        payload: {player: player.id}
    };
}

export const discardCardsResponse = (indexes: number[]) => {
    return {
        type: 'discardCardsResponse',
        payload: indexes,
    };
}