import {Card, ModuleCard, ModuleType, Vector2} from "../Types";

export const ModuleGetters = {
    asCard(module: ModuleCard): Card {
        return {cardType: "module", module};
    },

    position(module: ModuleCard): Vector2 {
        return {x: module.x, y: module.y};
    },

    isProtector(module: ModuleCard): boolean {
        return module.type === ModuleType.SmallQuantumProtector
            || module.type === ModuleType.QuantumProtector;
    },

    isMain(module: ModuleCard): boolean {
        return module.type === ModuleType.MainModule;
    },

    isWeapon(module: ModuleCard): boolean {
        return module.type === ModuleType.SpaceSolver
            || module.type === ModuleType.IonDestroyer
            || module.type === ModuleType.QuantumDestabilizer;
    }
};