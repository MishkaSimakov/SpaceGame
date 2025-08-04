import Player, {PlayerId} from "../Player";
import {Event} from "../events/Event";
import Vector2 from "../Vector2";
import Module from "../modules/Module";
import {MoveDamageReason} from "../Types";

export const permuteTopThreeEventCardsRequest = (player: Player, cards: Event[]) => {
    return {
        type: 'permuteTopThreeEventCardsRequest',
        payload: {player: player.id, cards}
    };
}

export const permuteTopThreeEventCardsResponse = (order: number[]) => {
    return {
        type: 'permuteTopThreeEventCardsResponse',
        payload: order,
    };
}

export const chooseModuleToDestroyRequest = (player: Player) => {
    return {
        type: 'chooseModuleToDestroyRequest',
        payload: {player: player.id}
    };
}

export const chooseModuleToDestroyResponse = (position: Vector2) => {
    return {
        type: 'chooseModuleToDestroyResponse',
        payload: position,
    };
}

export const chooseCardsForRepairSpaceshipRequest = (player: Player) => {
    return {
        type: 'chooseCardsForRepairSpaceshipRequest',
        payload: {player: player.id}
    };
}

export const chooseCardsForRepairSpaceshipResponse = (indexes: number[]) => {
    return {
        type: 'chooseCardsForRepairSpaceshipResponse',
        payload: indexes,
    };
}

export const chooseModulesToRepairByDiscardedCardsRequest = (player: Player, count: number) => {
    return {
        type: 'chooseModulesToRepairByDiscardedCardsRequest',
        payload: {player: player.id, count}
    };
}

export const chooseModulesToRepairByDiscardedCardsResponse = (positions: Vector2[]) => {
    return {
        type: 'chooseModulesToRepairByDiscardedCardsResponse',
        payload: positions,
    };
}


export const chooseTwoSolarPanelsToDestroyRequest = (player: Player) => {
    return {
        type: 'chooseTwoSolarPanelsToDestroyRequest',
        payload: {player: player.id}
    };
}

export const chooseTwoSolarPanelsToDestroyResponse = (positions: Vector2[]) => {
    return {
        type: 'chooseTwoSolarPanelsToDestroyResponse',
        payload: positions,
    };
}

export const chooseModuleToRepairByDiceRequest = (player: Player, amount: number) => {
    return {
        type: 'chooseModuleToRepairByDiceRequest',
        payload: {player: player.id, amount}
    };
}

export const chooseModuleToRepairByDiceResponse = (position: Vector2) => {
    return {
        type: 'chooseModuleToRepairByDiceResponse',
        payload: position,
    };
}

export const chooseCardsToDiscardAndTakeAnotherRequest = (player: Player) => {
    return {
        type: 'chooseCardsToDiscardAndTakeAnotherRequest',
        payload: {player: player.id}
    };
}

export const chooseCardsToDiscardAndTakeAnotherResponse = (indexes: number[]) => {
    return {
        type: 'chooseCardsToDiscardAndTakeAnotherResponse',
        payload: indexes,
    };
}

export const chooseModuleToMoveDamageRequest = (player: Player, reason: MoveDamageReason) => {
    return {
        type: 'chooseModuleToMoveDamageRequest',
        payload: {player: player.id, reason}
    };
}

export const chooseModuleToMoveDamageResponse = (from: Vector2, to: Vector2) => {
    return {
        type: 'chooseModuleToMoveDamageResponse',
        payload: {from, to},
    };
}

export const chooseModuleToDamageByDiceRequest = (player: Player, damage: number) => {
    return {
        type: 'chooseModuleToDamageByDiceRequest',
        payload: {player: player.id, damage}
    };
}

export const chooseModuleToDamageByDiceResponse = (victimId: PlayerId, victimModulePosition: Vector2) => {
    return {
        type: 'chooseModuleToDamageByDiceResponse',
        payload: {victimId, victimModulePosition},
    };
}

export const choosePlayerToStealCardRequest = (player: Player, options: PlayerId[]) => {
    return {
        type: 'choosePlayerToStealCardRequest',
        payload: {player: player.id, options}
    };
}

export const choosePlayerToStealCardResponse = (target: PlayerId) => {
    return {
        type: 'choosePlayerToStealCardResponse',
        payload: target,
    };
}

export const chooseCardToStealRequest = (player: Player, cards: (Module | Event)[]) => {
    return {
        type: 'chooseCardToStealRequest',
        payload: {player: player.id, cards}
    };
}

export const chooseCardToStealResponse = (chosenCardIndex: number) => {
    return {
        type: 'chooseCardToStealResponse',
        payload: chosenCardIndex,
    };
}

export const useEventCardToDealDamageRequest = (player: Player) => {
    return {
        type: 'useEventCardToDealDamageRequest',
        payload: {player: player.id}
    };
}

export const useEventCardToDealDamageResponse = (useEventCard: boolean) => {
    return {
        type: 'useEventCardToDealDamageResponse',
        payload: useEventCard
    };
}

export const chooseModuleToDamageByEventCardRequest = (player: Player, victim: Player) => {
    return {
        type: 'chooseModuleToDamageByEventCardRequest',
        payload: {player: player.id, victim: victim.id}
    };
}

export const chooseModuleToDamageByEventCardResponse = (position: Vector2) => {
    return {
        type: 'chooseModuleToDamageByEventCardResponse',
        payload: position
    };
}

export enum RunawayType {
    DICE,
    MAIN_MODULE
}

export const tryToRunawayRequest = (player: Player, type: RunawayType) => {
    return {
        type: 'tryToRunawayRequest',
        payload: {player: player.id, type}
    };
}

export const tryToRunawayResponse = (willRunaway: boolean) => {
    return {
        type: 'tryToRunawayResponse',
        payload: willRunaway
    };
}
