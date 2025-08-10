import {request} from "./ActionConstructors";
import Player, {PlayerId} from "../Player";
import Vector2 from "../Vector2";
import {MoveDamageReason} from "../Types";
import Module from "../modules/Module";
import {Event} from "../events/Event";

export enum RunawayType {
    DICE,
    MAIN_MODULE
}

export default {
    ...request(
        'permuteTopThreeEventCards',
        (player: Player, cards: Event[]) => ({payload: {player: player.id, cards}}),
        (order: number[]) => ({payload: order})
    ),

    ...request(
        'chooseModuleToDestroy',
        (player: Player) => ({payload: {player: player.id}}),
        (position: Vector2) => ({payload: position})
    ),

    ...request(
        'chooseCardsForRepairSpaceship',
        (player: Player) => ({payload: {player: player.id}}),
        (indexes: number[]) => ({payload: indexes})
    ),

    ...request(
        'chooseModulesToRepairByDiscardedCards',
        (player: Player, count: number) => ({payload: {player: player.id, count}}),
        (positions: Vector2[]) => ({payload: positions})
    ),

    ...request(
        'chooseTwoSolarPanelsToDestroy',
        (player: Player) => ({payload: {player: player.id}}),
        (positions: Vector2[]) => ({payload: positions})
    ),

    ...request(
        'chooseModuleToRepairByDice',
        (player: Player, amount: number) => ({payload: {player: player.id, amount}}),
        (position: Vector2) => ({payload: position})
    ),

    ...request(
        'chooseCardsToDiscardAndTakeAnother',
        (player: Player) => ({payload: {player: player.id}}),
        (indexes: number[]) => ({payload: indexes})
    ),

    ...request(
        'chooseModuleToMoveDamage',
        (player: Player, reason: MoveDamageReason) => ({payload: {player: player.id, reason}}),
        (from: Vector2, to: Vector2) => ({payload: {from, to}})
    ),

    ...request(
        'chooseModuleToDamageByDice',
        (player: Player, damage: number) => ({payload: {player: player.id, damage}}),
        (victimId: PlayerId, victimModulePosition: Vector2) => ({payload: {victimId, victimModulePosition}})
    ),

    ...request(
        'choosePlayerToStealCard',
        (player: Player, options: PlayerId[]) => ({payload: {player: player.id, options}}),
        (target: PlayerId) => ({payload: target})
    ),

    ...request(
        'chooseCardToSteal',
        (player: Player, cards: (Module | Event)[]) => ({payload: {player: player.id, cards}}),
        (chosenCardIndex: number) => ({payload: chosenCardIndex})
    ),

    ...request(
        'useEventCardToDealDamage',
        (player: Player) => ({payload: {player: player.id}}),
        (useEventCard: boolean) => ({payload: useEventCard})
    ),

    ...request(
        'chooseModuleToDamageByEventCard',
        (player: Player, victim: Player) => ({payload: {player: player.id, victim: victim.id}}),
        (position: Vector2) => ({payload: position})
    ),

    ...request(
        'tryToRunaway',
        (player: Player, type: RunawayType) => ({payload: {player: player.id, type}}),
        (willRunaway: boolean) => ({payload: willRunaway})
    ),
};
