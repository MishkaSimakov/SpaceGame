import Game from "../Game";
import {AttackReason} from "../../../../common/Types";
import {ModuleTypes} from "../../../../common/modules/Module";
import {MainModuleType} from "../../../../common/modules/MainModule";

export const attack = async (game: Game) => {
    if (!game.currentPlayer.spaceship.canAttack() || game.currentPlayer.energy < 5) {
        return;
    }

    console.log("   Player asked for attack");

    let attackedPlayer = await game.choosePlayerForAttack(AttackReason.AttackModule);

    if (!attackedPlayer) {
        console.log(`   Player ${game.currentPlayer.name} is peaceful`);

        return;
    }

    let energyCost = game.currentPlayer.spaceship.getModulesByType(ModuleTypes.AttackModule)[0].energyCost;
    game.currentPlayer.energy -= energyCost;

    await game.attackPlayer(attackedPlayer);

    if (!game.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn
        && game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime
        && game.currentPlayer.energy >= energyCost * 2) {
        let useSecondTime = await game.askForUseModuleSecondTime(game.currentPlayer, ModuleTypes.AttackModule);

        if (!useSecondTime)
            return;

        console.log("   Player use attack module for second time");

        game.currentPlayer.energy -= energyCost * 2;
        game.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = true;

        let attackedPlayer = await game.choosePlayerForAttack(AttackReason.UsingAttackModuleSecondTime);

        if (!attackedPlayer) {
            throw new Error('Attacked player is undefined in UsingAttackModuleSecondTime');
        }

        await game.attackPlayer(attackedPlayer);
    }
}
