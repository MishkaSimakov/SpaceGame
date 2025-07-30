import Player from "@common/Player";
import Module, {ModuleTypes} from "@common/modules/Module";
import Spaceship from "@common/Spaceship";
import {DamageInfo, SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {
    changeModuleHealth, deactivateProtectorIfActive,
    playerLost,
    pushCardsToDiscard, pushCardsToHand,
    removeSpaceshipModules
} from "@common/actions/Reducer";
import Vector2 from "@common/Vector2";

import {put, select} from "../../Effects";

function isDarkMatterGeneratorDestroyed(info: DamageInfo, spaceship: Spaceship): boolean {
    return info.destroyed.some(
        m => SpaceshipGetters.getModuleByPosition(spaceship, m.position).type === ModuleTypes.DarkMatterGenerator
    );
}

export function* damageModule(victim: Player, attacker: Player, module: Module, damage: number, isEvent: boolean) {
    const info = SpaceshipGetters.damageInfo(victim.spaceship, module, damage);

    if (info.shouldDeactivateProtector) {
        yield* put(deactivateProtectorIfActive(victim));
    }

    for (let damaged of info.damaged) {
        yield* put(changeModuleHealth(victim, damaged.position, damaged.damage, "damage module"));
    }

    for (let destroyed of info.destroyed) {
        const destroyedModule = SpaceshipGetters.getModuleByPosition(victim.spaceship, destroyed.position);

        yield* put(removeSpaceshipModules(victim, [destroyed.position]));

        if (isEvent || destroyed.byNuclearReactor) {
            yield* put(pushCardsToDiscard("module", [destroyedModule]));
        } else {
            yield* put(pushCardsToHand(attacker, [destroyedModule]));
        }
    }

    // update victim state
    victim = StateGetters.playerById(yield* select(), victim.id);

    if (info.destroyed.length !== 0) {
        let unconnectedModules = SpaceshipGetters.getUnconnectedModules(victim.spaceship);

        yield* put(removeSpaceshipModules(victim, unconnectedModules.map(m => new Vector2(m.x, m.y))));
        yield* put(pushCardsToHand(victim, unconnectedModules))
    }

    if (isDarkMatterGeneratorDestroyed(info, victim.spaceship)) {
        let modulesExceptMain = victim.spaceship.modules.filter(m => m.type !== ModuleTypes.MainModule);

        yield* put(removeSpaceshipModules(victim, modulesExceptMain.map(m => new Vector2(m.x, m.y))));
        yield* put(pushCardsToHand(victim, modulesExceptMain));
    }

    // update victim state
    victim = StateGetters.playerById(yield* select(), victim.id);

    // target.energy = Math.min(victim.energy, victim.spaceship.getTotalCapacity());

    if (!SpaceshipGetters.getMainModule(victim.spaceship)) {
        yield* put(playerLost(victim));
    }
}