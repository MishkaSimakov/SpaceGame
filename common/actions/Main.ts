import Player, {PlayerId} from "../Player";
import {AttackReason} from "../Types";
import Spaceship from "../Spaceship";
import Module, {ModuleType} from "../modules/Module";
import {Event} from "../events/Event";
import Vector2 from "../Vector2";

import {action, request} from "./ActionConstructors";

import ReducerActions from "./Reducer";
import InfoActions from "./Info";
import EventCardsActions from "./EventCards";
import RandomActions from "./Random";
import TimeActions from "./Time";

export default {
    ...ReducerActions,
    ...InfoActions,
    ...EventCardsActions,
    ...RandomActions,
    ...TimeActions,

    ...request(
        'choosePlayerForAttack',
        (player: Player, reason: AttackReason, required: boolean) => ({payload: {player: player.id, reason, required}}),
        (victim: PlayerId | undefined) => ({payload: {victim}})
    ),

    ...request(
        'rebuildSpaceship',
        (player: Player) => ({payload: {player: player.id}}),
        (newSpaceship: Spaceship, newHand: (Module | Event)[]) => ({payload: {newSpaceship, newHand}})
    ),

    ...request(
        'chooseCardType',
        (player: PlayerId) => ({payload: {player}}),
        (chosenType: "event" | "module") => ({payload: {chosenType}})
    ),

    ...request(
        'showCardsToPlayers',
        (player: Player, cardsReceiver: Player, cards: (Module | Event)[]) =>
            ({payload: {player: player.id, cardsReceiver: cardsReceiver.id, cards}}),
        () => ({payload: {}})
    ),

    ...request(
        'drawAdditionalModuleCard',
        (player: Player) => ({payload: {player: player.id}}),
        (draw: boolean) => ({payload: draw})
    ),

    ...request(
        'drawAnotherEventCard',
        (player: PlayerId) => ({payload: {player}}),
        (draw: boolean) => ({payload: draw})
    ),

    ...request(
        'discardCards',
        (player: Player) => ({payload: {player: player.id}}),
        (indexes: number[]) => ({payload: indexes})
    ),

    ...request(
        'chooseProtector',
        (player: Player) => ({payload: {player: player.id}}),
        (position: Vector2 | undefined) => ({payload: position})
    ),

    ...request(
        'chooseWeaponAndTarget',
        (player: Player, victim: Player) => ({payload: {player: player.id, victim: victim.id}}),
        (targetPosition: Vector2, weaponPosition: Vector2) => ({payload: {targetPosition, weaponPosition}})
    ),

    ...request(
        'useModuleSecondTime',
        (player: Player, moduleType: ModuleType) => ({payload: {player: player.id, moduleType}}),
        (use: boolean) => ({payload: use})
    ),

    ...request(
        'chooseTarget',
        (player: Player, victim: Player) => ({payload: {player: player.id, victim: victim.id}}),
        (position: Vector2) => ({payload: position})
    ),

    ...request(
        'chooseModuleToRepair',
        (player: Player) => ({payload: {player: player.id}}),
        (position: Vector2 | undefined) => ({payload: position})
    ),

    ...action(
        'reducerUpdatedState',
        (delta: any) => ({payload: {delta}})
    )
};
