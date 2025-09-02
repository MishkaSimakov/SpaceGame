import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {ModuleType, Player, Vector2} from "@common/Types";
import {
    changeModuleHealth, changePlayerEnergy,
    deactivateProtectorIfActive, playerLost,
    pushCardsToDiscard, pushCardsToHand,
    removeSpaceshipModules
} from "@common/Actions";
import {ModuleGetters} from "@common/getters/Module";

import {put, select} from "../runner/Effects";

type DamageType =
    | { type: "EventCard" }
    | { type: "Player", attacker: Player }

export function* damageModule(victim: Player, position: Vector2, damage: number, type: DamageType) {
    const module = SpaceshipGetters.getModuleByPosition(victim.spaceship, position)!;
    const info = SpaceshipGetters.damageInfo(victim.spaceship, module, damage);

    const isDarkMatterGeneratorDestroyed = info.destroyed.some(
        m => SpaceshipGetters.getModuleByPosition(victim.spaceship, m.position)!.type === ModuleType.DarkMatterGenerator
    );
    const isMainModuleDestroyed = info.destroyed.some(
        m => SpaceshipGetters.getModuleByPosition(victim.spaceship, m.position)!.type === ModuleType.MainModule
    );

    if (isMainModuleDestroyed) {
        info.destroyed = info.destroyed.filter(m => SpaceshipGetters.getModuleByPosition(victim.spaceship, m.position)!.type !== ModuleType.MainModule);
    }

    if (isMainModuleDestroyed || info.shouldDeactivateProtector) {
        yield* put(deactivateProtectorIfActive(victim.id));
    }

    for (let damaged of info.damaged) {
        yield* put(changeModuleHealth(victim.id, damaged.position, -damaged.damage, "damage module"));
    }

    for (let destroyed of info.destroyed) {
        const destroyedModule = SpaceshipGetters.getModuleByPosition(victim.spaceship, destroyed.position)!;

        yield* put(removeSpaceshipModules(victim.id, [destroyed.position]));

        if (destroyed.byNuclearReactor || type.type === "EventCard") {
            yield* put(pushCardsToDiscard([ModuleGetters.asCard(destroyedModule)]));
        } else {
            yield* put(pushCardsToHand(type.attacker.id, [ModuleGetters.asCard(destroyedModule)]));
        }
    }

    // update victim state
    victim = StateGetters.playerById(yield* select(), victim.id)!;

    if (info.destroyed.length !== 0) {
        const unconnectedModules = SpaceshipGetters.getUnconnectedModules(victim.spaceship);

        if (unconnectedModules.length !== 0) {
            yield* put(removeSpaceshipModules(victim.id, unconnectedModules.map(ModuleGetters.position)));
            yield* put(pushCardsToHand(victim.id, unconnectedModules.map(ModuleGetters.asCard)))
        }
    }

    if (isDarkMatterGeneratorDestroyed) {
        const modulesExceptMain = victim.spaceship.modules.filter(m => m.type !== ModuleType.MainModule);

        if (modulesExceptMain.length !== 0) {
            yield* put(removeSpaceshipModules(victim.id, modulesExceptMain.map(ModuleGetters.position)));
            yield* put(pushCardsToHand(victim.id, modulesExceptMain.map(ModuleGetters.asCard)));
        }
    }

    // update victim state
    victim = StateGetters.playerById(yield* select(), victim.id)!;

    if (victim.energy > SpaceshipGetters.getTotalCapacity(victim.spaceship)) {
        yield* put(changePlayerEnergy(
            victim.id,
            victim.energy - SpaceshipGetters.getTotalCapacity(victim.spaceship),
            "battery destroyed"
        ));
    }

    if (isMainModuleDestroyed) {
        yield* put(playerLost(victim.id));
    }
}