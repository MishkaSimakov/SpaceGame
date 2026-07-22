import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {
    changeModuleHealth,
    changePlayerEnergy,
    chooseModuleToRepairRequest,
    message, playerUseModuleSecondTime,
    useModuleSecondTimeRequest
} from "@common/Actions";
import {MainModuleType, ModuleType} from "@common/Types";

import {put, select} from "../runner/Effects";
import {request} from "../components/Request";

function* useRepairModule(repairModuleCost: number, secondTime: boolean): Generator<any, boolean, any> {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const {position} = yield* request(
        chooseModuleToRepairRequest(currentPlayer.id),
        'chooseModuleToRepairResponse'
    );

    if (!position) {
        return false;
    }

    yield* put(changeModuleHealth(currentPlayer.id, position, 1, "used repair module"));
    yield* put(changePlayerEnergy(currentPlayer.id, -repairModuleCost, "used repair module"));

    const module = SpaceshipGetters.getModuleByPositionOrFail(currentPlayer.spaceship, position);

    if (!secondTime) {
        yield* put(message(currentPlayer.id, `чинит ${module.name}, используя ремонтный модуль (-${repairModuleCost}⚡)`));
    } else {
        yield* put(message(currentPlayer.id, `чинит ${module.name}, используя ремонтный модуль второй раз (-${repairModuleCost}⚡)`));
    }

    return true;
}

function* tryUseModuleSecondTime(repairModuleCost: number) {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (!currentPlayer.usedModuleSecondTimeOnThisTurn
        && SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.UseModuleSecondTime
        && SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)
        && currentPlayer.energy >= repairModuleCost * 2
    ) {
        const useSecondTime = yield* request(
            useModuleSecondTimeRequest(currentPlayer.id, ModuleType.RepairModule),
            'useModuleSecondTimeResponse'
        );

        if (!useSecondTime.use) return;

        yield* put(playerUseModuleSecondTime(currentPlayer.id));

        yield* useRepairModule(repairModuleCost * 2, true);
    }
}

export function* fixSpaceship() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (!SpaceshipGetters.hasRepairModule(currentPlayer.spaceship)
        || !SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)
    ) {
        return;
    }

    const repairModuleCost = SpaceshipGetters.getModulesByType(currentPlayer.spaceship, ModuleType.RepairModule)[0].energyCost;

    if (currentPlayer.energy < repairModuleCost) {
        return;
    }

    const usedModule = yield* useRepairModule(repairModuleCost, false);

    if (usedModule) {
        yield* tryUseModuleSecondTime(repairModuleCost);
    }
}
