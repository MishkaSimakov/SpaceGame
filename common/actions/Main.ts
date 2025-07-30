import Player, {PlayerId} from "../Player";
import {AttackReason} from "../Types";
import Spaceship from "../Spaceship";
import Module from "../modules/Module";
import {Event} from "../events/Event";
import GameState from "../../server/src/game/GameState";
import Vector2 from "../Vector2";

export * from "./Reducer";
export * from "./EventCards";

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

export const showCardsToPlayersRequest = (cards: (Module | Event)[], player: Player, showToOthers: boolean) => {
    return {
        type: 'showCardsToPlayersRequest',
        payload: {cards, player: player.id, showToOthers}
    }
}

export const showCardsToPlayersResponse = () => {
    return {type: 'showCardsToPlayersResponse'};
}

export const drawAdditionalModuleCardRequest = (player: Player) => {
    return {
        type: 'drawAdditionalModuleCardRequest',
        payload: {player: player.id}
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

export const reducerUpdatedState = (state: GameState) => {
    return {
        type: 'reducerUpdatedState',
        payload: {state}
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