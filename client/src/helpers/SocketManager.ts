import Game from "../scenes/game";
import Controls from "../scenes/controls";
import io, {Socket} from "socket.io-client";
import Player from "../../../common/Player";
import {plainToClass} from "../../../common/PlainToClass";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import RebuildSpaceshipManager from "./RebuildSpaceshipManager";
import {Event} from "../../../common/events/Event";
import EventCardsListener from "../listeners/EventCardsListener";
import BaseListener from "../listeners/BaseListener";

export default class SocketManager {
    link: number;
    game: Game;
    controls: Controls;
    socket: Socket;

    players: Record<number, Player> = {};

    rebuildSpaceshipManager: RebuildSpaceshipManager;
    listeners: any[] = [EventCardsListener];

    constructor(game: Game, controls: Controls) {
        this.link = parseInt(window.location.href.split('/').pop());

        this.game = game;
        this.controls = controls;

        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this.game, this.controls);

        this.initSocket('http://localhost:3000');

        // register another socket listeners
        console.log("Register listeners");
        for (let listener of this.listeners) {
            console.log("Registering: ", listener.toString());

            new listener(this.game, this.controls, this.socket, this.link);
        }
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.socket.on('connect', () => {
            console.log('connected!');
        });

        this.socket.on('disconnect', () => {
            location.href = 'http://localhost:3000';
        })

        this.socket.on('getLink', (callback: (link: number) => void) => {
            callback(this.link);
        });

        this.socket.on('setPlayersStatus', (players: { link: number, online: boolean }[]) => {
            if (Object.keys(this.players).length === 0)
                return;

            for (let player of players)
                this.players[player.link].online = player.online;

            this.controls.drawPlayersList(players.map(p => {
                return {link: p.link, online: p.online, isMe: p.link === this.link}
            }), (link) => {
                this.game.panToPlayerWithLink(link);
            });
        });

        this.socket.on('setPlayersData', (players: Player[]) => {
            for (let [index, player] of players.entries()) {
                player = plainToClass(player, Player.getPropertiesMap());

                this.players[player.link] = player;

                this.game.drawSpaceshipOf(player, index, Object.keys(players).length);
            }

            this.controls.drawHand(this.getCurrentPlayer().hand);
            this.controls.drawStatusBar(this.getCurrentPlayer());

            this.rebuildSpaceshipManager.player = this.getCurrentPlayer();
            this.rebuildSpaceshipManager.controls = this.controls;

            this.controls.drawPlayersList(players.map(p => {
                return {link: p.link, online: p.online, isMe: p.link === this.link}
            }), (link) => {
                this.game.panToPlayerWithLink(link);
            });
        });

        this.socket.on('rebuildSpaceship', (player: Player, callback: (Player) => void) => {
            // this.player = plainToClass(player, Player.getPropertiesMap());
            //
            // this.controls.drawHand(this.player.hand);
            // this.controls.drawStatusBar(this.player);
            //
            // this.rebuildSpaceshipManager.player = this.player;
            // this.rebuildSpaceshipManager.controls = this.controls;

            this.getCurrentPlayer().energy = player.energy;
            this.controls.setEnergy(this.getCurrentPlayer().energy);

            this.controls.setStatus("Your turn");

            this.setRebuildSpaceshipAllowed(true);

            this.controls.addButton("End rebuild", () => {
                this.controls.removeButtons();

                this.setRebuildSpaceshipAllowed(false);

                callback(this.getCurrentPlayer());
            });
        });

        this.socket.on('discardCards', (callback: (discardedCardsIndexes: number[]) => void) => {
            let requiredDiscardCount = this.getCurrentPlayer().hand.length - 5;

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
            let otherPlayersLinks: number[] = [];

            for (let [id, player] of Object.entries(this.players)) {
                if (player.link === this.link)
                    continue;

                otherPlayersLinks.push(player.link);
            }

            this.controls.choosePlayerForAttack(otherPlayersLinks).then((link?: number) => {
                callback(link);
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

            this.game.chooseModule((module?: Module) => {
                selectedProtector = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.link)
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

        this.socket.on('chooseWeaponAndTarget', (targetPlayerLink: number, callback: (response: { weapon: [number, number], target: [number, number] }) => void) => {
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

            this.game.chooseModule((module?: Module) => {
                selectedWeapon = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.link)
                    return false;

                return module.strength > 0;
            }, true, 0xa3b18a);

            this.game.chooseModule((module?: Module) => {
                selectedTarget = module;
            }, (module?: Module, playerLink?: number) => {
                return playerLink === targetPlayerLink;
            }, true, 0xe76f51);
        });

        this.socket.on('chooseModuleToRepair', (callback: (modulePosition?: [number, number]) => void) => {
            let chosenModule: Module;

            this.game.chooseModule((module) => {
                chosenModule = module;
            }, (module, playerLink) => {
                if (playerLink !== this.getCurrentPlayer().link)
                    return false;

                if (module.health === module.totalHealth)
                    return false;

                return true;
            }, false, 0xe76f51);

            this.controls.addButton("Repair", () => {
                this.controls.removeButtons();
                this.game.endChoosingModule();

                if (chosenModule !== undefined) {
                    callback([chosenModule.x, chosenModule.y]);
                } else {
                    callback();
                }
            });
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

    getCurrentPlayer() {
        return this.players[this.link];
    }
}