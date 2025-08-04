import Player, {PlayerId} from "../Player";
import {AttackReason} from "../Types";
import Spaceship from "../Spaceship";
import Module, {ModuleType} from "../modules/Module";
import {Event} from "../events/Event";
import GameState from "../../server/src/game/GameState";
import Vector2 from "../Vector2";

export * from "./Reducer";
export * from "./EventCards";

export const choosePlayerForAttackRequest = (player: Player, reason: AttackReason) => {
    return {
        type: 'choosePlayerForAttackRequest',
        payload: {player: player.id, reason}
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

export const showCardsToPlayersRequest = (player: Player, cardsReceiver: Player, cards: (Module | Event)[]) => {
    return {
        type: 'showCardsToPlayersRequest',
        payload: {player: player.id, cardsReceiver: cardsReceiver.id, cards}
    }
}

export const showCardsToPlayersResponse = () => {
    return {type: 'showCardsToPlayersResponse'};
}

export const showCardsInfo = (player: Player, cardsReceiver: Player, cards: (Module | Event)[]) => {
    return {
        type: 'showCardsInfo',
        payload: {player: player.id, cardsReceiver: cardsReceiver.id, cards}
    }
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

export const chooseProtectorRequest = (player: Player) => {
    return {
        type: 'chooseProtectorRequest',
        payload: {player: player.id}
    };
}

export const chooseProtectorResponse = (position: Vector2 | undefined) => {
    return {
        type: 'chooseProtectorResponse',
        payload: position,
    };
}

export const chooseWeaponAndTargetRequest = (player: Player, victim: Player) => {
    return {
        type: 'chooseWeaponAndTargetRequest',
        payload: {player: player.id, victim: victim.id}
    };
}

export const chooseWeaponAndTargetResponse = (targetPosition: Vector2, weaponPosition: Vector2) => {
    return {
        type: 'chooseWeaponAndTargetResponse',
        payload: {targetPosition, weaponPosition},
    };
}

export const useModuleSecondTimeRequest = (player: Player, moduleType: ModuleType) => {
    return {
        type: 'useModuleSecondTimeRequest',
        payload: {player: player.id, moduleType}
    };
}

export const useModuleSecondTimeResponse = (use: boolean) => {
    return {
        type: 'useModuleSecondTimeResponse',
        payload: use,
    };
}

export const chooseTargetRequest = (player: Player, victim: Player) => {
    return {
        type: 'chooseTargetRequest',
        payload: {player: player.id, victim: victim.id}
    };
}

export const chooseTargetResponse = (position: Vector2) => {
    return {
        type: 'chooseTargetResponse',
        payload: position,
    };
}

export const chooseModuleToRepairRequest = (player: Player) => {
    return {
        type: 'chooseModuleToRepairRequest',
        payload: {player: player.id}
    };
}

export const chooseModuleToRepairResponse = (position: Vector2 | undefined) => {
    return {
        type: 'chooseModuleToRepairResponse',
        payload: position
    };
}