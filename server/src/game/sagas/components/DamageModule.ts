import Player from "@common/Player";
import {ModuleType} from "@common/modules/Module";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {
    changeModuleHealth, deactivateProtectorIfActive,
    playerLost,
    pushCardsToDiscard, pushCardsToHand,
    removeSpaceshipModules
} from "@common/actions/Reducer";
import Vector2 from "@common/Vector2";

import {put, select} from "../../Effects";

type DamageType =
    | { type: "EventCard" }
    | { type: "Player", attacker: Player }

export function* damageModule(victim: Player, position: Vector2, damage: number, type: DamageType) {
    const module = SpaceshipGetters.getModuleByPosition(victim.spaceship, position);
    const info = SpaceshipGetters.damageInfo(victim.spaceship, module, damage);

    const isDarkMatterGeneratorDestroyed = info.destroyed.some(
        m => SpaceshipGetters.getModuleByPosition(victim.spaceship, m.position).type === ModuleType.DarkMatterGenerator
    );

    if (info.shouldDeactivateProtector) {
        yield* put(deactivateProtectorIfActive(victim));
    }

    for (let damaged of info.damaged) {
        yield* put(changeModuleHealth(victim, damaged.position, -damaged.damage, "damage module"));
    }

    for (let destroyed of info.destroyed) {
        const destroyedModule = SpaceshipGetters.getModuleByPosition(victim.spaceship, destroyed.position);

        yield* put(removeSpaceshipModules(victim, [destroyed.position]));

        if (destroyed.byNuclearReactor) {
            yield* put(pushCardsToDiscard("module", [destroyedModule]));
        }

        switch (type.type) {
            case "EventCard":
                yield* put(pushCardsToDiscard("module", [destroyedModule]));
                break;
            case "Player":
                yield* put(pushCardsToHand(type.attacker, [destroyedModule]));
                break;
        }
    }

    // update victim state
    victim = StateGetters.playerById(yield* select(), victim.id);

    if (info.destroyed.length !== 0) {
        let unconnectedModules = SpaceshipGetters.getUnconnectedModules(victim.spaceship);

        yield* put(removeSpaceshipModules(victim, unconnectedModules.map(m => new Vector2(m.x, m.y))));
        yield* put(pushCardsToHand(victim, unconnectedModules))
    }

    if (isDarkMatterGeneratorDestroyed) {
        let modulesExceptMain = victim.spaceship.modules.filter(m => m.type !== ModuleType.MainModule);

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