import Player from "../../../common/Player";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import Game from "./Game";
import Vector2 from "../../../common/Vector2";
import {MainModuleType} from "../../../common/modules/MainModule";
import {TimeRecordType} from "./TimeManager";

// chooseProtectors -> willYouRunaway -> chooseWeaponAndTarget -> updateOtherPlayerData
export default class FightManager {
    first: Player;
    second: Player;

    isFirstPlayerTurn: boolean = true;

    isFightEnded: boolean = false;

    gameManager: Game;

    constructor(first: Player, second: Player, gameManager: Game) {
        this.first = first;
        this.second = second;

        this.gameManager = gameManager;
    }

    getEnemyOf(player: Player): Player {
        if (player.id === this.first.id)
            return this.second;
        if (player.id === this.second.id)
            return this.first

        return undefined;
    }

    async fight(): Promise<Player | undefined> {
        if (!this.first.canDamage() && !this.second.canDamage()) {
            this.isFightEnded = true;
            return;
        }

        while (!this.isFightEnded) {
            this.gameManager.syncPlayersData();

            let attacker = this.isFirstPlayerTurn ? this.first : this.second;
            let target = this.isFirstPlayerTurn ? this.second : this.first;

            this.gameManager.timeManager.addRecord(TimeRecordType.FIGHT_TURN_STARTED, attacker);

            let destroyed = await this.makeFightIteration(attacker, target);

            this.gameManager.timeManager.addRecord(TimeRecordType.FIGHT_TURN_ENDED, attacker);

            if (destroyed !== undefined) {
                console.log(`Fight has ended. ${destroyed.name} was destroyed`);
                return destroyed;
            }

            this.isFirstPlayerTurn = !this.isFirstPlayerTurn;
        }

        if (this.first.spaceship.activatedProtector)
            this.first.spaceship.activatedProtector.isActivated = false;
        this.first.spaceship.activatedProtector = undefined;

        if (this.second.spaceship.activatedProtector)
            this.second.spaceship.activatedProtector.isActivated = false;
        this.second.spaceship.activatedProtector = undefined;

        console.log(`Fight has ended. No one destroyed`);
    }

    protected async makeFightIteration(attacker: Player, target: Player): Promise<Player | undefined> {
        console.log(`Fight iteration. ${attacker.name} attack ${target.name}`);

        if (target.canProtect())
            await this.chooseProtectors(attacker, target);

        let isEscaped = await this.askForRunaway(attacker);

        if (isEscaped) {
            this.isFightEnded = true;
            return;
        }

        if (attacker.canDamage()) {
            let usedWeapon = await this.chooseWeaponAndTarget(attacker, target);

            attacker.energy -= usedWeapon.energyCost;

            if (target.spaceship.getModulesByType(ModuleTypes.MainModule).length === 0) {
                this.isFightEnded = true;
                return target;
            }

            if (attacker.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime && attacker.energy >= usedWeapon.energyCost * 2) {
                let useSecondTime = await this.gameManager.askForUseModuleSecondTime(attacker, usedWeapon.type);

                if (useSecondTime) {
                    attacker.energy -= usedWeapon.energyCost * 2;

                    let targetModule = await this.chooseTarget(attacker, target, usedWeapon);

                    this.damage(attacker, target, usedWeapon, targetModule);
                }
            }
        }

        if (target.spaceship.activatedProtector)
            target.spaceship.activatedProtector.isActivated = false;
        target.spaceship.activatedProtector = undefined;

        if (!target.spaceship.getMainModule()) {
            this.isFightEnded = true;
            return target;
        }

        if (!target.canDamage() && !attacker.canDamage()) {
            this.isFightEnded = true;
            return;
        }
    }

    protected async chooseProtectors(attacker: Player, target: Player) {
        await this.gameManager.emitToPlayerAndWait(target, 'chooseProtectors', (protectorPosition?: Vector2) => {
            if (protectorPosition !== undefined) {
                let protector: Module = target.spaceship.getModuleByPosition(protectorPosition);
                target.spaceship.setProtector(protector);

                protector.isActivated = true;

                target.energy -= protector.energyCost;
            }
        });
    }

    protected async askForRunaway(attacker: Player): Promise<boolean> {
        return await this.gameManager.emitToPlayerAndWait(attacker, 'willYouRunaway', (isTryingToRunaway: boolean) => {
            if (!isTryingToRunaway) {
                console.log(`   Player dont try to run away`);

                return false;
            }

            console.log(`   Player try to run away`);

            if (Math.random() * 6 >= 5) {
                console.log(`   Player has run away`);

                return true;
            } else {
                return false;
            }
        });
    }

    protected async chooseWeaponAndTarget(attacker: Player, target: Player): Promise<Module> {
        return await this.gameManager.emitToPlayerAndWait(attacker, 'chooseWeaponAndTarget', target.id, (weaponPosition: Vector2, targetPosition: Vector2) => {
            let weapon: Module = attacker.spaceship.getModuleByPosition(weaponPosition);
            let targetModule: Module = target.spaceship.getModuleByPosition(targetPosition);

            console.log(`   Player has chosen weapon (module at x: ${weapon.x}, y: ${weapon.y}) to attack target (module at x: ${targetModule.x}, y: ${targetModule.y})`);

            this.damage(attacker, target, weapon, targetModule);

            return weapon;
        });
    }

    protected async chooseTarget(attacker: Player, target: Player, weapon: Module): Promise<Module> {
        return await this.gameManager.emitToPlayerAndWait(attacker, 'chooseTarget', target.id, weapon, (targetPosition: Vector2) => {
            let targetModule: Module = target.spaceship.getModuleByPosition(targetPosition);

            console.log(`   Player has chosen attack module at x: ${targetModule.x}, y: ${targetModule.y}`);

            return targetModule;
        });
    }

    protected damage(attacker: Player, target: Player, weapon: Module, targetModule: Module) {
        let destroyed = target.spaceship.damage(targetModule, weapon, false);

        this.gameManager.handleDestroyedModules(target, attacker, destroyed, false);
    }
}
