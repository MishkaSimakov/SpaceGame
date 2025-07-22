import {Action} from './Action';
import Player, {PlayerId} from "../../../../common/Player";
import {AttackReason} from "../../../../common/Types";
import Spaceship from "../../../../common/Spaceship";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import GameState from "../GameState";

export const initGameState = (state: GameState): Action => {
    return {
        type: 'initGameState',
        payload: {state}
    };
}

export const choosePlayerForAttackRequest = (player: PlayerId, reason: AttackReason): Action => {
    return {
        type: 'choosePlayerForAttackRequest',
        payload: {player, reason}
    };
}

export const choosePlayerForAttackResponse = (victim: PlayerId): Action => {
    return {
        type: 'choosePlayerForAttackResponse',
        payload: {victim}
    };
}

export const rebuildSpaceshipRequest = (player: PlayerId): Action => {
    return {
        type: 'rebuildSpaceshipRequest',
        payload: {player}
    };
}

export const rebuildSpaceshipResponse = (newSpaceship: Spaceship, newHand: (Module | Event)[]): Action => {
    return {
        type: 'rebuildSpaceshipResponse',
        payload: {newSpaceship, newHand}
    };
}

export const useAttackLaterEventCard = (attacker: PlayerId, victim: PlayerId): Action => {
    return {
        type: 'useAttackLaterEventCard',
        payload: {attacker, victim}
    };
}

export const playerRebuiltSpaceship = (player: PlayerId, newSpaceship: Spaceship, newHand: (Module | Event)[]): Action => {
    return {
        type: 'playerRebuiltSpaceship',
        payload: {player, newSpaceship, newHand}
    };
}