import * as Actions from "@common/Actions";
import {
    changePlayerEnergy,
    playerRebuiltSpaceship,
    pushCardsToHand,
    pushCardsToStack,
    removeSpaceshipModules
} from "@common/Actions";
import {put, SagaGenerator, select} from "@src/game/sagas/runner/Effects";
import {EventCard, ModuleCard, ModuleConnectors, ModuleType} from "@common/Types";
import {mainModulesInfo, modulesInfo} from "@common/cards/Modules";
import {ModuleGetters} from "@common/getters/Module";
import {eventsInfo} from "@common/cards/Events";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";

type PerformerType<T extends keyof typeof Actions> =
    (cheat: ReturnType<(typeof Actions)[T]>["payload"]) => SagaGenerator;

type CheatsPerformersContainer = {
    // TODO: remove optionality
    [Key in keyof typeof Actions as (Key extends `cheat${string}` ? Key : never)]?: PerformerType<Key>
};

function* getNextModuleId() {
    const state = yield* select();

    const maxId = Math.max(...[
        ...state.discards.module,
        ...state.stack.module,
        ...state.mainModulesStack,
        ...state.players.flatMap(p => p.hand.filter(c => c.cardType === "module").map(m => m.module))
    ].map(m => m.id));

    return maxId + 1;
}

function* constructModule(type: ModuleType, connectors: ModuleConnectors) {
    const config = modulesInfo[type];

    const module: ModuleCard = {
        id: yield* getNextModuleId(),
        name: config.name,
        strength: config.strength ?? 0,
        capacity: config.capacity ?? 0,
        energyCost: config.energyCost ?? 0,
        energyIncrease: config.energyIncrease ?? 0,
        type: type,
        totalHealth: config.health,
        health: config.health,
        x: 0,
        y: 0,
        rotation: 0,
        connectors
    };

    return module;
}

export const cheatsPerformers: CheatsPerformersContainer = {
    * cheatChangeEnergy(cheat) {
        yield* put(changePlayerEnergy(cheat.target, cheat.delta, "cheat"));
    },
    * cheatPushModuleCardToHand(cheat) {
        yield* put(pushCardsToHand(cheat.target, [
            ModuleGetters.asCard(yield* constructModule(cheat.type, cheat.connectors))
        ]))
    },
    * cheatPushModuleCardToStack(cheat) {
        yield* put(pushCardsToStack([
            ModuleGetters.asCard(yield* constructModule(cheat.type, cheat.connectors))
        ]))
    },
    * cheatPushEventCardToHand(cheat) {
        const event: EventCard = {
            id: 0,
            type: cheat.type,
            description: eventsInfo[cheat.type].description
        };

        yield* put(pushCardsToHand(cheat.target, [{cardType: "event", event}]));
    },
    * cheatPushEventCardToStack(cheat) {
        const event: EventCard = {
            id: 0,
            type: cheat.type,
            description: eventsInfo[cheat.type].description
        };

        yield* put(pushCardsToStack([{cardType: "event", event}]));
    },

    * cheatSetMainModuleType(cheat) {
        const config = mainModulesInfo[cheat.type];

        const module: ModuleCard = {
            id: yield* getNextModuleId(),
            name: config.name,
            connectors: cheat.connectors,
            strength: config.strength ?? 0,
            capacity: config.capacity ?? 0,
            energyCost: config.energyCost ?? 0,
            energyIncrease: config.energyIncrease ?? 0,
            type: ModuleType.MainModule,
            totalHealth: config.health,
            health: config.health,
            x: 0,
            y: 0,
            rotation: 0,
        };

        let spaceship = StateGetters.playerById(yield* select(), cheat.target)!.spaceship;
        const oldMainModule = SpaceshipGetters.getMainModule(spaceship)!;

        yield* put(removeSpaceshipModules(cheat.target, [ModuleGetters.position(oldMainModule)]));

        // update spaceship after main module was removed
        spaceship = StateGetters.playerById(yield* select(), cheat.target)!.spaceship;

        const unconnectedModules = SpaceshipGetters.getUnconnectedModules(spaceship);

        yield* put(removeSpaceshipModules(cheat.target, unconnectedModules.map(ModuleGetters.position)));
        yield* put(pushCardsToHand(cheat.target, unconnectedModules.map(ModuleGetters.asCard)));

        // place new main module
        yield* put(playerRebuiltSpaceship(
            cheat.target,
            {modules: [module]},
            StateGetters.playerById(yield* select(), cheat.target)!.hand
        ));
    }
}