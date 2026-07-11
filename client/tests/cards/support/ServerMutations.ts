import fc from "fast-check";

import {ModuleType, OtherPlayer, Player, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {asCard, eventAsCard, IdAllocator, makeEvent, makeModule, MODULE_VARIANTS} from "./Cards";

/**
 * Ways the server state can change between two updates, so that reconcile is exercised against
 * plausible transitions rather than arbitrary noise.
 *
 * Every mutation leaves the server state legal — in particular a ship stays connected. The server
 * never sends a disconnected ship: when a module is destroyed, anything it was holding on falls off
 * too, and those modules leave the ship in the same update.
 */

export type ServerState = { player: Player, otherPlayers: OtherPlayer[] };

export type Mutation =
    { kind: "damage", pick: number }
    | { kind: "destroyLocalModule", pick: number }
    | { kind: "destroyOpponentModule", pick: number, opponent: number }
    | { kind: "drawModule", pick: number }
    | { kind: "drawEvent" }
    | { kind: "discardHandCard", pick: number }
    | { kind: "shipModuleToHand", pick: number };

export const mutationArb: fc.Arbitrary<Mutation> = fc.oneof(
    fc.record({kind: fc.constant("damage" as const), pick: fc.nat({max: 100})}),
    fc.record({kind: fc.constant("destroyLocalModule" as const), pick: fc.nat({max: 100})}),
    fc.record({
        kind: fc.constant("destroyOpponentModule" as const),
        pick: fc.nat({max: 100}),
        opponent: fc.nat({max: 100})
    }),
    fc.record({kind: fc.constant("drawModule" as const), pick: fc.nat({max: 100})}),
    fc.record({kind: fc.constant("drawEvent" as const)}),
    fc.record({kind: fc.constant("discardHandCard" as const), pick: fc.nat({max: 100})}),
    fc.record({kind: fc.constant("shipModuleToHand" as const), pick: fc.nat({max: 100})})
);

export const mutationsArb: fc.Arbitrary<Mutation[]> = fc.array(mutationArb, {maxLength: 5});

/**
 * Removes a module and everything that consequently falls off, leaving only the component still
 * holding the command module. Returns every module removed.
 */
function removeKeepingConnected(ship: Spaceship, id: number) {
    ship.modules = ship.modules.filter(m => m.id !== id);

    const main = SpaceshipGetters.getMainModule(ship);

    if (main === undefined) {
        const dropped = ship.modules;
        ship.modules = [];
        return dropped;
    }

    const attached = SpaceshipGetters.getComponents(ship)
        .find(component => component.modules.some(m => m.id === main.id))!;

    const survivors = new Set(attached.modules.map(m => m.id));
    const dropped = ship.modules.filter(m => !survivors.has(m.id));

    ship.modules = ship.modules.filter(m => survivors.has(m.id));

    return dropped;
}

/** Modules that can be taken off a ship: never the command module, or the player would be dead. */
function detachable(ship: Spaceship) {
    return ship.modules.filter(m => m.type !== ModuleType.MainModule);
}

export function applyMutations(state: ServerState, mutations: Mutation[], ids: IdAllocator) {
    for (const mutation of mutations) {
        apply(state, mutation, ids);
    }
}

function apply(state: ServerState, mutation: Mutation, ids: IdAllocator) {
    const {player, otherPlayers} = state;

    switch (mutation.kind) {
        case "damage": {
            const all = [...player.spaceship.modules, ...otherPlayers.flatMap(p => p.spaceship.modules)];

            if (all.length === 0) {
                return;
            }

            const module = all[mutation.pick % all.length];
            module.health = Math.max(0, module.health - 1);

            return;
        }

        case "destroyLocalModule": {
            const targets = detachable(player.spaceship);

            if (targets.length === 0) {
                return;
            }

            // destroyed outright: it leaves the game entirely, along with anything it was holding on
            removeKeepingConnected(player.spaceship, targets[mutation.pick % targets.length].id);

            return;
        }

        case "destroyOpponentModule": {
            const alive = otherPlayers.filter(p => detachable(p.spaceship).length > 0);

            if (alive.length === 0) {
                return;
            }

            const opponent = alive[mutation.opponent % alive.length];
            const targets = detachable(opponent.spaceship);

            removeKeepingConnected(opponent.spaceship, targets[mutation.pick % targets.length].id);

            return;
        }

        case "drawModule": {
            player.hand.push(asCard(makeModule(ids, MODULE_VARIANTS[mutation.pick % MODULE_VARIANTS.length])));
            return;
        }

        case "drawEvent": {
            player.hand.push(eventAsCard(makeEvent(ids)));
            return;
        }

        case "discardHandCard": {
            if (player.hand.length === 0) {
                return;
            }

            player.hand.splice(mutation.pick % player.hand.length, 1);
            return;
        }

        case "shipModuleToHand": {
            const targets = detachable(player.spaceship);

            if (targets.length === 0) {
                return;
            }

            const module = targets[mutation.pick % targets.length];
            const dropped = removeKeepingConnected(player.spaceship, module.id);

            // it came off the ship rather than being destroyed, so it lands in the hand — as does
            // anything that fell off with it
            player.hand.push(asCard(module), ...dropped.map(asCard));

            return;
        }
    }
}

/** Ids for cards the server draws after a board was generated; kept clear of the board's own. */
export function freshIds(): IdAllocator {
    return new IdAllocator(900000);
}
