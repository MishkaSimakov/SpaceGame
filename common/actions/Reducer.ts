import Module from "../modules/Module";
import {Event} from "../events/Event";
import Player, {PlayerId} from "../Player";
import Vector2 from "../Vector2";
import Spaceship from "../Spaceship";
import GameState from "../../server/src/game/GameState";

export const initGameState = (state: GameState) => {
    return {
        type: 'initGameState',
        payload: {state}
    };
}

export const playerRebuiltSpaceship = (player: PlayerId, newSpaceship: Spaceship, newHand: (Module | Event)[]) => {
    return {
        type: 'playerRebuiltSpaceship',
        payload: {player, newSpaceship, newHand}
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

export const popCardFromHeap = (type: "module" | "event") => {
    return {
        type: 'popCardFromHeap',
        payload: {type}
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

export const returnDiscardsToStack = (type: "module" | "event", discards: (Module | Event)[]) => {
    return {
        type: 'returnDiscardsToStack',
        payload: {type, discards}
    };
}

export const playerSkipNextTurn = (player: PlayerId) => {
    return {
        type: 'playerSkipNextTurn',
        payload: {player}
    };
}

export const destructSpaceshipModules = (player: Player, positions: Vector2[], destructedCardsDestiny: "discard" | "hand", detachedCardsDestiny: "discard" | "hand") => {
    return {
        type: 'destructSpaceshipModules',
        payload: {player: player.id, positions, destructedCardsDestiny, detachedCardsDestiny}
    };
}

export const pushCurrentEventToPlayerHand = (player: Player) => {
    return {
        type: 'pushCurrentEventToPlayerHand',
        payload: {player: player.id}
    };
}

export const pushCardsToStack = (type: "module" | "event", cards: Module[] | Event[]) => {
    return {
        type: 'pushCardsToStack',
        payload: {type, cards}
    };
};

export const disposeCurrentEventCard = () => {
    return {type: 'disposeCurrentEventCard'};
};

export const setCardAsCurrentEventCard = (card: Event) => {
    return {
        type: 'setCardAsCurrentEventCard',
        payload: card
    };
};

export const pushCardsToHand = (player: Player, cards: (Module | Event)[]) => {
    return {
        type: 'pushCardsToHand',
        payload: {player: player.id, cards}
    };
}

export const changeModuleHealth = (player: Player, position: Vector2, delta: number, reason: string) => {
    return {
        type: 'changeModuleHealth',
        payload: {player: player.id, position, delta},
        meta: {reason}
    };
}

export const popCardFromPlayerHand = (player: Player, index: number) => {
    return {
        type: 'popCardFromPlayerHand',
        payload: {player: player.id, index},
    };
}

export const deactivateProtector = (player: Player) => {
    return {
        type: 'deactivateProtector',
        payload: {player: player.id}
    };
}

export const removeSpaceshipModules = (player: Player, positions: Vector2[]) => {
    return {
        type: 'removeSpaceshipModules',
        payload: {player: player.id, positions}
    };
}

export const pushCardsToDiscard = (type: "module" | "event", cards: Module[] | Event[]) => {
    return {
        type: 'pushCardsToDiscard',
        payload: {type, cards}
    }
}

export const playerLost = (player: Player) => {
    return {
        type: 'playerLost',
        payload: {player}
    }
}