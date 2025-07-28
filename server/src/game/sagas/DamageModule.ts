// target: Player, attacker: Player, destroyedModules: {
//     module: Module,
//         byReactor: boolean
// }[], isEvent: boolean

import Player from "@common/Player";
import Module from "@common/modules/Module";

export function* damageModule(victim: Player, attacker: Player, module: Module, isEvent: boolean) {
    for (let destroyedInfo of destroyedModules) {
        let module = destroyedInfo.module

        console.log(`   Module at x: ${module.x}, y: ${module.y} has been destroyed`);

        module.isActivated = false;

        target.spaceship.removeModule(module);

        if (module.type === ModuleTypes.MainModule) {
            return;
        }

        module.health = module.totalHealth;

        if (isEvent || destroyedInfo.byReactor) {
            this.gameData.discardCards([module]);
        } else {
            attacker.hand.push(module);
        }
    }

    if (destroyedModules.length !== 0) {
        let unconnectedModules = target.spaceship.getUnconnectedModules();

        target.spaceship.removeModule(unconnectedModules);
        target.hand.push(...unconnectedModules);
    }

    // dark matter generator destroyed
    if (destroyedModules.filter((d) => d.module.type === ModuleTypes.DarkMatterGenerator).length) {
        let modulesExceptMain = target.spaceship.modules.filter(m => m.type !== ModuleTypes.MainModule);

        target.spaceship.removeModule(modulesExceptMain);
        target.hand.push(...modulesExceptMain);
    }

    target.energy = Math.min(target.energy, target.spaceship.getTotalCapacity());

    if (!target.spaceship.getMainModule()) {
        target.setLose();
    }
}