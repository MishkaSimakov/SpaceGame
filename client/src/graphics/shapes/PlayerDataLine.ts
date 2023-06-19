import {NodeConfig} from "../engine/Node";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import {Group} from "../engine/Group";
import {Text} from "../engine/shapes/Text";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";

export interface PlayerDataLineConfig extends NodeConfig {
    player: OtherPlayer,
    withName: boolean,
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

        this.add(
            new Text({
                x: 0,
                y: 0,
                text: (this.withName() ? (player.online ? "🔴 " : "✖️ ") : "") + player.name + ":",
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white",
            })
        );

        availableSpace -= 150;
        startX += 150;

        let elementsCount = this.withTimeControl() ? 3 : 2;
        let spacePerElement = availableSpace / elementsCount;

        this.add(
            new Text({
                x: startX,
                y: 0,
                text: `${player.energy}/${player.spaceship.getTotalCapacity()} ⚡️`,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white",
            })
        );

        this.add(
            new Text({
                x: startX + spacePerElement,
                y: 0,
                text: `${player.handSize} 🤚`,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white",
            })
        );

        if (this.withTimeControl()) {
            this.add(
                new Text({
                    x: startX + spacePerElement * 3,
                    y: 0,
                    text: `${this.timeToString(this.time())} ` + (this.time() >= 0) ? '⏰' : '🤡',
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: "white",
                    name: "time",

                    originX: 1,
                    align: 'right'
                })
            );
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
        (this.findOne('.time') as Text)?.text(`${this.timeToString(time)} ⏰`);

        this.setAttr('time', time);

        return this;
    }

    onClick(callback): PlayerDataLine {
        this._hitRect.on('click', callback);

        return this;
    }

    private timeToString(time: number): string {
        function padWithLeadingZeros(num, totalLength) {
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

    player: GetSet<OtherPlayer, this>;
    withName: GetSet<boolean, this>;
    withTimeControl: GetSet<boolean, this>;
    time: GetSet<number, this>;
}

Factory.addGetterSetter(PlayerDataLine, 'player');
Factory.addGetterSetter(PlayerDataLine, 'withName', false);
Factory.addGetterSetter(PlayerDataLine, 'withTimeControl', false);
Factory.addGetterSetter(PlayerDataLine, 'time', false);
