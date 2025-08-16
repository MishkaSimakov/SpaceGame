import {OtherPlayer} from "@common/GameForPlayerDTO";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {Group, GroupConfig} from "konva/lib/Group";
import {Text} from "konva/lib/shapes/Text";

export type PlayerStatus = {
    online: boolean,
    lost: boolean,
    isHisTurn: boolean
};

type PlayerDataLineConfig = GroupConfig & {
    player: OtherPlayer,
    status: PlayerStatus,
    withTimeControl: boolean,
    time: number,
    width: number
}

export class PlayerDataLine extends Group {
    constructor(config: PlayerDataLineConfig) {
        super(config);

        let startX = 0;
        let availableSpace = config.width;

        const playerNameText = new Text({
            x: 0,
            y: 0,
            text: config.player.name + ":",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
        });

        this.add(playerNameText);

        // Add status text below player name
        const statusText = new Text({
            x: 0,
            y: 18,  // slightly below the player name (15 font size + small gap)
            text: this.getStatusString(config.status),
            fontFamily: "Exo2Regular",
            fontSize: 11,
            fill: "grey",
        });

        this.add(statusText);

        availableSpace -= 150;
        startX += 150;

        let elementsCount = config.withTimeControl ? 3 : 2;
        let spacePerElement = availableSpace / elementsCount;

        if (!config.player.lose) {
            this.add(
                new Text({
                    x: startX,
                    y: 0,
                    text: `${config.player.energy}/${SpaceshipGetters.getTotalCapacity(config.player.spaceship)}(+${SpaceshipGetters.getTotalEnergyIncrease(config.player.spaceship)}) ⚡️`,
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: "white",
                })
            );

            this.add(
                new Text({
                    x: startX + spacePerElement,
                    y: 0,
                    text: `${config.player.handSize} 🤚`,
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: "white",
                })
            );

            if (config.withTimeControl) {
                this.add(
                    new Text({
                        x: startX + spacePerElement * 3,
                        y: 0,
                        text: this.timeToString(config.time),
                        fontFamily: "Exo2Bold",
                        fontSize: 15,
                        fill: "white",
                        name: "time",

                        originX: 1,
                        align: 'right'
                    })
                );
            }
        }
    }

    setTime(time: number) {
        (this.findOne('.time') as Text)?.text(this.timeToString(time));
        return this;
    }

    onClick(callback: () => void): PlayerDataLine {
        this.on('click', callback);
        return this;
    }

    private timeToString(time: number): string {
        function padWithLeadingZeros(num: number, totalLength: number) {
            return String(num).padStart(totalLength, '0');
        }

        time = Math.floor(time / 1000);

        if (time >= 0) {
            let minutes = Math.floor(time / 60);
            return minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2) + " ⏰";
        } else {
            time = -time;
            let minutes = Math.floor(time / 60);
            return "-" + minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2) + " 🤡";
        }
    }

    private getStatusString(status: PlayerStatus) {
        if (status.lost) {
            return "проиграл";
        }

        let result = "";

        result += status.online ? "в сети" : "не в сети";

        if (status.isHisTurn) {
            result += ", ходит";
        }

        return result;
    }
}
