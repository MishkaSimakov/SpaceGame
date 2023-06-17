import Game from "../Game";
import {ModuleTypes} from "../../../../common/modules/Module";
import {MainModuleType} from "../../../../common/modules/MainModule";
import Vector2 from "../../../../common/Vector2";

const useRepairModule = async (game: Game, energyCost: number): Promise<boolean> => {
    return await game.emitToCurrentPlayerAndWait('chooseModuleToRepair', async (modulePosition?: Vector2) => {
        if (!modulePosition)
            return false;

        game.messageManager.addMessage(`починился ремонтным модулем`, game.currentPlayer);

        let module = game.currentPlayer.spaceship.getModuleByPosition(modulePosition);

        game.currentPlayer.energy -= energyCost;
        module.health = Math.min(module.health + 1, module.totalHealth);

        return true;
    });
}

export const fixSpaceship = async (game: Game) => {
    if (!game.currentPlayer.spaceship.hasRepairModule()
        || !game.currentPlayer.spaceship.hasDamagedModules()
        || game.currentPlayer.energy < 2
    ) {
        return;
    }

    console.log("   Player asked for repair spaceship")

    let repairModuleCost = game.currentPlayer.spaceship.getModulesByType(ModuleTypes.RepairModule)[0].energyCost;

    let isRepaired = await useRepairModule(game, repairModuleCost);

    if (!game.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn && isRepaired
        && game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime
        && game.currentPlayer.spaceship.hasDamagedModules()
        && game.currentPlayer.energy >= repairModuleCost * 2
    ) {
        let useSecondTime = await game.askForUseModuleSecondTime(game.currentPlayer, ModuleTypes.RepairModule);

        if (!useSecondTime)
            return;

        game.messageManager.addMessage(`починился ремонтным модулем x2`, game.currentPlayer);
        console.log("   Player use repair module for second time");

        game.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = true;

        await useRepairModule(game, repairModuleCost * 2);
    }
}
