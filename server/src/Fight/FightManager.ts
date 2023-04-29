import Player from "../../../common/Player";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import Game from "../Game";

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

    async fight(): Promise<Player | undefined> {
        while (!this.isFightEnded) {
            this.gameManager.setPlayersData();

            let destroyed = await this.makeFightIteration();

            if (destroyed !== undefined)
                return destroyed;

            this.isFirstPlayerTurn = !this.isFirstPlayerTurn;
        }
    }

    protected async makeFightIteration(): Promise<Player | undefined> {
        let attacker = this.isFirstPlayerTurn ? this.first : this.second;
        let target = this.isFirstPlayerTurn ? this.second : this.first;

        console.log(`Fight iteration. Player ${attacker.link} attack player ${target.link}`);

        if (target.spaceship.hasProtectors())
            await this.chooseProtectors(attacker, target);

        let isEscaped = await this.askForRunaway(attacker);

        if (isEscaped) {
            this.isFightEnded = true;
            return;
        }

        if (attacker.canDamage())
            await this.chooseWeaponAndTarget(attacker, target);

        if (target.spaceship.getModulesByType(ModuleTypes.MainModule).length === 0) {
            this.isFightEnded = true;
            return target;
        }

        if (!target.canDamage() && !attacker.canDamage()) {
            this.isFightEnded = true;
            return;
        }
    }

    protected async chooseProtectors(attacker: Player, target: Player) {
        await new Promise(resolve => {
            this.gameManager.emitToPlayerAndWait(target, 'chooseProtectors', (response: { protector?: [number, number] }) => {
                if (response.protector !== undefined) {
                    target.spaceship.setProtector(target.spaceship.getModuleByPosition(response.protector[0], response.protector[1]));
                }

                resolve(true);
            });
        });
    }

    protected async askForRunaway(attacker: Player): Promise<boolean> {
        return new Promise(resolve => {
            this.gameManager.emitToPlayerAndWait(attacker, 'willYouRunaway', (response: { tryToRunaway: boolean }) => {
                if (response.tryToRunaway)
                    console.log(`   Player try to run away`);
                else
                    console.log(`   Player dont try to run away`);

                if (response.tryToRunaway && Math.random() * 6 >= 5) {
                    console.log(`   Player has run away`);

                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    protected async chooseWeaponAndTarget(attacker: Player, target: Player) {
        return new Promise(resolve => {
            this.gameManager.emitToPlayerAndWait(attacker, 'chooseWeaponAndTarget', target.link, (response: { weapon: [number, number], target: [number, number] }) => {
                let weapon: Module = attacker.spaceship.getModuleByPosition(response.weapon[0], response.weapon[1]);
                let targetModule: Module = target.spaceship.getModuleByPosition(response.target[0], response.target[1]);

                console.log(`   Player has chosen weapon (module at x: ${weapon.x}, y: ${weapon.y}) to attack target (module at x: ${targetModule.x}, y: ${targetModule.y})`);

                let destroyed = target.spaceship.damage(targetModule, weapon);

                for (let module of destroyed) {
                    console.log(`   Module at x: ${module.x}, y: ${module.y} has been destroyed`);

                    target.spaceship.removeModule(module);

                    if (module.type === ModuleTypes.MainModule) {
                        resolve(true);
                        return;
                    }

                    attacker.hand.push(module);
                }

                if (destroyed.length !== 0) {
                    let unconnectedModules = target.spaceship.getUnconnectedModules();

                    target.spaceship.removeModule(unconnectedModules);
                    target.hand.push(...unconnectedModules)
                }

                target.spaceship.activatedProtector = undefined;

                resolve(true);
            });
        });
    }
}