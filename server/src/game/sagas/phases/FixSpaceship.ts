import {ModuleType} from "@common/modules/ModuleCard";
import {MainModuleType} from "@common/modules/MainModule";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import Actions from "@common/actions/Main";

import {put, select} from "../Effects";
import {request} from "../components/Request";

const {
    changeModuleHealth,
    changePlayerEnergy,
    chooseModuleToRepairRequest,
    playerUseModuleSecondTime,
    useModuleSecondTimeRequest,
} = Actions;

function* useRepairModule(repairModuleCost: number, secondTime: boolean): Generator<any, boolean, any> {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const modulePosition = yield* request(
        chooseModuleToRepairRequest(currentPlayer),
        'chooseModuleToRepairResponse'
    );

    if (!modulePosition) {
        return false;
    }

    yield* put(changeModuleHealth(currentPlayer, modulePosition, 1, "used repair module"));
    yield* put(changePlayerEnergy(currentPlayer, -repairModuleCost, "used repair module"));

    const module = SpaceshipGetters.getModuleByPosition(currentPlayer.spaceship, modulePosition)!;

    if (!secondTime) {
        yield* put(Actions.message(currentPlayer, `чинит ${module.name}, используя ремонтный модуль (-${repairModuleCost}⚡)`));
    } else {
        yield* put(Actions.message(currentPlayer, `чинит ${module.name}, используя ремонтный модуль второй раз (-${repairModuleCost}⚡)`));
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
            useModuleSecondTimeRequest(currentPlayer, ModuleType.RepairModule),
            'useModuleSecondTimeResponse'
        );

        if (!useSecondTime) return;

        yield* put(playerUseModuleSecondTime(currentPlayer));

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
