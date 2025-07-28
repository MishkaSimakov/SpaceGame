import Player, {PlayerId} from "../Player";
import {AttackReason} from "../Types";
import Spaceship from "../Spaceship";
import Module from "../modules/Module";
import {Event} from "../events/Event";
import GameState from "../../server/src/game/GameState";
import Vector2 from "../Vector2";

export * from "./Reducer";

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

export const chooseModuleToMoveDamageRequest = (player: Player) => {
    return {
        type: 'chooseModuleToMoveDamageRequest',
        payload: {player: player.id}
    };
}

export const chooseModuleToMoveDamageResponse = (from: Vector2, to: Vector2) => {
    return {
        type: 'chooseModuleToMoveDamageResponse',
        payload: {from, to},
    };
}

export const chooseModuleToDamageRequest = (player: Player) => {
    return {
        type: 'chooseModuleToDamageRequest',
        payload: {player: player.id}
    };
}

export const chooseModuleToDamageResponse = (victimId: PlayerId, victimModulePosition: Vector2) => {
    return {
        type: 'chooseModuleToDamageResponse',
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