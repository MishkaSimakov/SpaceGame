import Game from "../scenes/game";
import Controls from "../scenes/controls";
import io, {Socket} from "socket.io-client";
import Player from "../../../common/Player";
import {plainToClass} from "../../../common/PlainToClass";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import RebuildSpaceshipManager from "./RebuildSpaceshipManager";
import {Event} from "../../../common/events/Event";

export default class SocketManager {
    game: Game;
    controls: Controls;
    socket: Socket;

    player: Player;
    otherPlayers: Record<string, Player> = {};

    rebuildSpaceshipManager: RebuildSpaceshipManager;

    constructor(game: Game, controls: Controls) {
        this.game = game;
        this.controls = controls;

        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this.game, this.controls);

        this.initSocket('http://localhost:3000');
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.socket.on('connect', () => {
            console.log('connected!');
        });

        this.socket.on('setPlayersData', (players: { [index: string]: Player }) => {
            for (let [index, key] of Object.entries(Object.keys(players))) {
                let player = plainToClass(players[key], Player.getPropertiesMap());

                if (key === this.socket.id) {
                    this.player = player;
                } else {
                    this.otherPlayers[key] = player;
                }

                this.game.drawSpaceshipOf(player, parseInt(index), Object.keys(players).length);
            }

            this.controls.drawHand(this.player.hand);
            this.controls.drawStatusBar(this.player);

            this.rebuildSpaceshipManager.player = this.player;
            this.rebuildSpaceshipManager.controls = this.controls;
        });

        this.socket.on('rebuildSpaceship', (player: Player, callback: (Player) => void) => {
            // this.player = plainToClass(player, Player.getPropertiesMap());
            //
            // this.controls.drawHand(this.player.hand);
            // this.controls.drawStatusBar(this.player);
            //
            // this.rebuildSpaceshipManager.player = this.player;
            // this.rebuildSpaceshipManager.controls = this.controls;

            this.player.energy = player.energy;
            this.controls.setEnergy(this.player.energy);

            this.controls.setStatus("Your turn");

            this.setRebuildSpaceshipAllowed(true);

            this.controls.addButton("End rebuild", () => {
                this.controls.removeButtons();

                this.setRebuildSpaceshipAllowed(false);

                callback(this.player);
            });
        });

        this.socket.on('discardCards', (callback: (discardedCardsIndexes: number[]) => void) => {
            let requiredDiscardCount = this.player.hand.length - 5;

            this.controls.discardCards(requiredDiscardCount).then((discardedCardsIndexes: number[]) => {
                callback(discardedCardsIndexes);
            });
        });

        this.socket.on('showCard', (card: Module | Event) => {
            this.controls.showCard(card);
        })

        this.socket.on('chooseCardType', (callback: (cardType: string) => void) => {
            this.controls.chooseCardType().then((cardType: string) => {
                callback(cardType);
            });
        });

        this.socket.on('willYouFight', (callback) => {
            let otherPlayersNames: string[] = [];

            for (let [id, player] of Object.entries(this.otherPlayers))
                otherPlayersNames.push(player.id);

            this.controls.choosePlayerForAttack(otherPlayersNames).then((id?: string) => {
                callback({
                    attackedPlayerId: id
                });
            });
        });

        this.socket.on('chooseProtectors', (callback: (response: { protector?: [number, number] }) => void) => {
            let selectedProtector: Module;

            this.controls.setStatus("Select protector");
            this.controls.addButton("Next", () => {
                if (selectedProtector !== undefined)
                    callback({
                        protector: [selectedProtector.x, selectedProtector.y]
                    });
                else
                    callback({});

                this.controls.removeButtons();

                this.game.endChoosingModule();
            });

            this.game.chooseModule((module?: Module, playerId?: string) => {
                selectedProtector = module;
            }, (module?: Module, playerId?: string) => {
                if (playerId !== this.player.id)
                    return false;

                if (module.type !== ModuleTypes.SmallQuantumProtector && module.type !== ModuleTypes.QuantumProtector)
                    return false;

                return true;
            }, false, 0xa3b18a);
        });

        this.socket.on('willYouRunaway', (callback: (response: { tryToRunaway: boolean }) => void) => {
            this.controls.askForRunaway().then((isRunningAway: boolean) => {
                callback({
                    tryToRunaway: isRunningAway
                });
            });
        });

        this.socket.on('chooseWeaponAndTarget', (targetPlayerId: string, callback: (response: { weapon: [number, number], target: [number, number] }) => void) => {
            let selectedWeapon: Module;
            let selectedTarget: Module;

            this.controls.setStatus("Choose weapon and target");

            this.controls.addButton("Next", () => {
                if (selectedWeapon === undefined && selectedTarget === undefined)
                    return;

                callback({
                    weapon: [selectedWeapon.x, selectedWeapon.y],
                    target: [selectedTarget.x, selectedTarget.y]
                });

                this.controls.removeButtons();
                this.game.endChoosingModule();
            });

            this.game.chooseModule((module?: Module, playerId?: string) => {
                selectedWeapon = module;
            }, (module?: Module, playerId?: string) => {
                if (playerId !== this.player.id)
                    return false;

                if (module.strength === 0)
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.game.chooseModule((module?: Module, playerId?: string) => {
                selectedTarget = module;
            }, (module?: Module, playerId?: string) => {
                return playerId === targetPlayerId;
            }, true, 0xe76f51);
        });
    }

    setRebuildSpaceshipAllowed(allowed: boolean): void {
        console.log("rebuild spaceship allowed", allowed);

        if (allowed) {
            this.rebuildSpaceshipManager.allowRebuildSpaceship();
        } else {
            this.rebuildSpaceshipManager.disallowRebuildSpaceship();
        }
    }
}