import {SpaceshipGetters} from "@common/getters/Spaceship";

import {NodeConfig} from "../engine/Node";
import {Group} from "../engine/Group";
import {Text} from "../engine/shapes/Text";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {OtherPlayer} from "@common/Types";
import Color from "@common/helpers/Color";

export type PlayerStatus = {
    online: boolean,
    lost: boolean,
    isHisTurn: boolean
};

export interface PlayerDataLineConfig extends NodeConfig {
    player: OtherPlayer,
    status: PlayerStatus,
    withTimeControl: boolean,
    time: number,
    width: number
}

export class PlayerDataLine extends Group<PlayerDataLineConfig> {
    _hitRect: Rectangle;

    constructor(config: PlayerDataLineConfig) {
        super(config);

        let startX = 0;
        const player = this.player();

        let availableSpace = this.width();

        const playerNameText = new Text({
            x: 0,
            y: 0,
            text: player.name + ":",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: Color.WHITE.toString(),
        });

        this.add(playerNameText);

        // Add status text below player name
        const statusText = new Text({
            x: 0,
            y: 18,  // slightly below the player name (15 font size + small gap)
            text: this.getStatusString(config.status),
            fontFamily: "Exo2Regular",
            fontSize: 11,
            fill: Color.GREY.toString(),
        });

        this.add(statusText);

        availableSpace -= 150;
        startX += 150;

        let elementsCount = this.withTimeControl() ? 3 : 2;
        let spacePerElement = availableSpace / elementsCount;

        if (!this.player().lose) {
            this.add(
                new Text({
                    x: startX,
                    y: 0,
                    text: `${player.energy}/${SpaceshipGetters.getTotalCapacity(player.spaceship)}(+${SpaceshipGetters.getTotalEnergyIncrease(player.spaceship)}) ⚡️`,
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: Color.WHITE.toString(),
                })
            );

            this.add(
                new Text({
                    x: startX + spacePerElement,
                    y: 0,
                    text: `${player.handSize} 🤚`,
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: Color.WHITE.toString(),
                })
            );

            if (this.withTimeControl()) {
                this.add(
                    new Text({
                        x: startX + spacePerElement * 3,
                        y: 0,
                        text: `${this.timeToString(this.time())} ` + (this.time() >= 0 ? '⏰' : '🤡'),
                        fontFamily: "Exo2Bold",
                        fontSize: 15,
                        fill: Color.WHITE.toString(),
                        name: "time",

                        originX: 1,
                        align: 'right'
                    })
                );
            }
        }

        let hitOffset = 5;
        let hitRect = new Rectangle({
            x: -hitOffset,
            y: -hitOffset,
            width: this.width() + hitOffset * 2,
            height: this.height() + hitOffset * 2,
            visible: false,
        });

        this._hitRect = hitRect;

        this.add(hitRect);
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return;

        this._hitRect.drawHit();
    }

    setTime(time: number) {
        (this.findOne('.time') as Text)?.text(`${this.timeToString(time)} ` + (this.time() >= 0 ? '⏰' : '🤡'));

        this.setAttr('time', time);

        return this;
    }

    onClick(callback: () => void): PlayerDataLine {
        this._hitRect.on('click', callback);

        return this;
    }

    private timeToString(time: number): string {
        function padWithLeadingZeros(num: number, totalLength: number) {
            return String(num).padStart(totalLength, '0');
        }

        time = Math.floor(time / 1000);

        if (time >= 0) {
            let minutes = Math.floor(time / 60);
            return minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2);
        } else {
            time = -time;
            let minutes = Math.floor(time / 60);
            return "-" + minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2);
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

    player: GetSet<OtherPlayer, this>;
    withTimeControl: GetSet<boolean, this>;
    time: GetSet<number, this>;
}

Factory.addGetterSetter(PlayerDataLine, 'player');
Factory.addGetterSetter(PlayerDataLine, 'withTimeControl', false);
Factory.addGetterSetter(PlayerDataLine, 'time', false);
