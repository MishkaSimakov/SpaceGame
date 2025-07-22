import {Action} from './Action';
import Player, {PlayerId} from "../../../../common/Player";
import {AttackReason} from "../../../../common/Types";
import Spaceship from "../../../../common/Spaceship";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import GameState from "../GameState";

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

export const useAttackLaterEventCard = (attacker: PlayerId, victim: PlayerId) => {
    return {
        type: 'useAttackLaterEventCard',
        payload: {attacker, victim}
    };
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

export const chooseCardTypeResponse = (chosenType: string) => {
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

export const playerAcknowledgedDrawnCard = () => {
    return {type: 'playerAcknowledgedDrawnCard'};
}

export const shiftTurnToNextPlayer = () => {
    return {type: 'shiftTurnToNextPlayer'};
}

export const collectEnergyBeforeTurn = (player: PlayerId, amount: number) => {
    return {
        type: 'collectEnergyBeforeTurn',
        payload: {player, amount}
    }
}