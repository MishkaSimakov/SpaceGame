import Module from "../modules/Module";
import {Event} from "../events/Event";
import Player, {PlayerId} from "../Player";
import Vector2 from "../Vector2";
import Spaceship from "../Spaceship";
import GameState, {TimeRecordType} from "../../server/src/game/GameState";
import {action} from "./ActionConstructors";
import {CardTypeFromName} from "../Types";

export default {
    ...action('initGameState', (state: GameState) => {
        return {
            payload: {state}
        };
    }),

    ...action('playerRebuiltSpaceship', (player: Player, newSpaceship: Spaceship, newHand: (Module | Event)[]) => {
        return {
            payload: {player: player.id, newSpaceship, newHand}
        };
    }),

    ...action('disposeCardsFromPlayerHand', (player: Player, indices: number[], reason: string) => {
        return {
            payload: {player: player.id, indices},
            meta: {reason}
        };
    }),

    ...action('beginFight', (attacker: PlayerId, victim: PlayerId, reason: string) => {
        return {
            payload: {attacker, victim},
            meta: {reason}
        }
    }),

    ...action('popCardFromHeap', (type: "module" | "event") => {
        return {payload: {type}};
    }),

    ...action('setCurrentPlayer', (player: Player) => ({payload: {player: player.id}})),

    ...action('changePlayerEnergy', (player: Player, delta: number, reason: string) => {
        return {
            type: 'changePlayerEnergy',
            payload: {player: player.id, delta},
            meta: {reason}
        }
    }),

    ...action('returnDiscardsToStack', (type: "module" | "event", discards: (Module | Event)[]) => {
        return {
            type: 'returnDiscardsToStack',
            payload: {type, discards}
        };
    }),

    ...action('playerSkipNextTurn', (player: PlayerId) => {
        return {
            type: 'playerSkipNextTurn',
            payload: {player}
        };
    }),

    ...action('destructSpaceshipModules', (player: Player, positions: Vector2[], destructedCardsDestiny: "discard" | "hand", detachedCardsDestiny: "discard" | "hand") => {
        return {
            type: 'destructSpaceshipModules',
            payload: {player: player.id, positions, destructedCardsDestiny, detachedCardsDestiny}
        };
    }),

    ...action('pushCardsToStack', (type: "module" | "event", cards: Module[] | Event[]) => {
        return {
            type: 'pushCardsToStack',
            payload: {type, cards}
        };
    }),

    ...action('pushCardsToHand', (player: Player, cards: (Module | Event)[]) => {
        return {
            payload: {player: player.id, cards}
        };
    }),

    ...action('changeModuleHealth', (player: Player, position: Vector2, delta: number, reason: string) => {
        return {
            payload: {player: player.id, position, delta},
            meta: {reason}
        };
    }),

    ...action('popCardFromPlayerHand', (player: Player, index: number) => {
        return {
            payload: {player: player.id, index},
        };
    }),

    ...action('deactivateProtectorIfActive', (player: Player) => {
        return {
            type: 'deactivateProtectorIfActive',
            payload: {player: player.id}
        };
    }),

    ...action('removeSpaceshipModules', (player: Player, positions: Vector2[]) => {
        return {
            payload: {player: player.id, positions}
        };
    }),

    ...action('pushCardsToDiscard', <T extends "module" | "event">(type: T, cards: CardTypeFromName<T>[]) => {
        return {
            payload: {type, cards}
        };
    }),

    ...action('playerLost', (player: Player) => {
        return {
            payload: {player: player.id}
        };
    }),

    ...action('endFight', () => ({payload: {}})),

    ...action('activateProtector', (player: Player, position: Vector2) => {
        return {
            payload: {player: player.id, position}
        };
    }),

    ...action('shiftFightTurnToNextPlayer', () => ({payload: {}})),

    ...action('playerUseModuleSecondTime', (player: Player) => {
        return {
            payload: {player: player.id}
        };
    }),

    ...action('addTimeRecord', (player: PlayerId, type: TimeRecordType, time: number) => {
        return {
            payload: {player, type, time}
        };
    }),

    ...action('changePlayerTime', (player: PlayerId, delta: number) => {
        return {
            payload: {player, delta}
        };
    }),

    ...action('insertPause', (from: number, to: number) => ({payload: {from, to}}))
}