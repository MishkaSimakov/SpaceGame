import Player from "../common/Player";
import {Socket} from "socket.io";
import Module, {ModuleTypes} from "../common/modules/Module";
import Game from "./Game";


// chooseProtectors -> willYouRunaway -> chooseWeaponAndTarget -> updateOtherPlayerData
export default class FightManager {
    first: Player;
    second: Player;

    isFirstPlayerTurn: boolean = true;

    gameManager: Game;

    onFightEnded: (destroyedPlayer?: Player) => void;

    constructor(first: Player, second: Player, onFightEnded: (destroyedPlayer?: Player) => void, gameManager: Game) {
        this.first = first;
        this.second = second;

        this.onFightEnded = onFightEnded;

        this.gameManager = gameManager;
    }

    makeFightIteration() {
        let attacker = this.isFirstPlayerTurn ? this.first : this.second;
        let target = this.isFirstPlayerTurn ? this.second : this.first;

        console.log(`Fight iteration. Player ${attacker.id} attack player ${target.id}`);

        this.chooseProtectors(attacker, target);
    }

    protected chooseProtectors(attacker: Player, target: Player) {
        if (!target.spaceship.hasProtectors()) {
            this.askForRunaway(attacker, target);

            return;
        }

        this.getSocket(target.id).emit('chooseProtectors', (response: { protector?: [number, number] }) => {
            if (response.protector !== undefined) {
                target.spaceship.setProtector(target.spaceship.getModuleByPosition(response.protector[0], response.protector[1]));
            }

            this.askForRunaway(attacker, target);
        });
    }

    protected askForRunaway(attacker: Player, target: Player) {
        this.getSocket(attacker.id).emit('willYouRunaway', (response: { tryToRunaway: boolean }) => {
            if (response.tryToRunaway)
                console.log(`   Player try to run away`);
            else
                console.log(`   Player dont try to run away`);

            if (response.tryToRunaway && Math.random() * 6 >= 5) {
                console.log(`   Player has run away`);

                this.endFight();

                return;
            } else {
                this.chooseWeaponAndTarget(attacker, target);
            }
        });
    }

    protected chooseWeaponAndTarget(attacker: Player, target: Player) {
        if (!attacker.spaceship.hasWeapon()) {
            this.isFirstPlayerTurn = !this.isFirstPlayerTurn;
            this.makeFightIteration();

            return;
        }

        this.getSocket(attacker.id).emit('chooseWeaponAndTarget', target.id, (response: { weapon: [number, number], target: [number, number] }) => {
            let weapon: Module = attacker.spaceship.getModuleByPosition(response.weapon[0], response.weapon[1]);
            let targetModule: Module = target.spaceship.getModuleByPosition(response.target[0], response.target[1]);

            console.log(`   Player has chosen weapon (module at x: ${weapon.x}, y: ${weapon.y}) to attack target (module at x: ${targetModule.x}, y: ${targetModule.y})`);

            let destroyed = target.spaceship.damage(targetModule, weapon);

            for (let module of destroyed) {
                console.log(`   Module at x: ${module.x}, y: ${module.y} has been destroyed`);

                if (module.type === ModuleTypes.MainModule) {
                    this.endFight(target);

                    return;
                }

                target.spaceship.removeModule(module);

                attacker.hand.push(module);
            }

            if (destroyed.length !== 0) {
                let unconnectedModules = target.spaceship.getUnconnectedModules();

                target.spaceship.removeModule(unconnectedModules);
                target.hand.push(...unconnectedModules)
            }

            if (!target.spaceship.hasWeapon() && !attacker.spaceship.hasWeapon()) {
                this.endFight();
            }

            this.gameManager.setPlayersData();

            this.isFirstPlayerTurn = !this.isFirstPlayerTurn;

            this.makeFightIteration();
        });
    }

    protected endFight(destroyedPlayer?: Player) {
        console.log("Fight has ended");

        if (destroyedPlayer !== undefined)
            console.log(`Player ${destroyedPlayer.id} has destroyed`);

        this.onFightEnded(destroyedPlayer);
    }

    protected getSocket(id: string): Socket {
        return this.gameManager.io.sockets.sockets.get(id);
    }
}