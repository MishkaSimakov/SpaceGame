import {OtherPlayer} from "@common/GameForPlayerDTO";
import {PlayerId} from "@common/Player";

import Modal from "../Modal";
import Controls from "../scenes/Controls";
import {AttackReason} from "@common/Types";
import {COLORS} from "../constants";
import {Activity} from "./Activity";

const reasonStatus: Record<AttackReason, string> = {
    [AttackReason.AttackModule]: "Используйте абордажный модуль, чтобы напасть",
    [AttackReason.MainModule]: "Используйте командный модуль, чтобы напасть",
    [AttackReason.AttackAnyEventCard]: "Выберите игрока для нападения",
    [AttackReason.AttackLaterEventCard]: "Используйте карточку, чтобы напасть",
    [AttackReason.UsingAttackModuleSecondTime]: "Выберите игрока для нападения"
}

export class ChoosePlayerForAttackActivity extends Activity {
    private modal: Modal;

    constructor(
        private scene: Controls,
        private players: OtherPlayer[],
        private attackReason: AttackReason,
        private required: boolean
    ) {
        super();
    }

    activate(): Promise<number | undefined> {
        return new Promise<number | undefined>(resolve => {
            this.scene.topBarDrawer.setStatus(reasonStatus[this.attackReason]);

            const buttons = [{
                text: !this.required ? "Да" : "Выбрать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    this.scene.topBarDrawer.setAllButtonsDisabled(true);

                    this.showModal().then(playerId => {
                        if (playerId !== undefined) {
                            this.scene.topBarDrawer.removeButtons();
                            this.scene.topBarDrawer.clearStatus();

                            resolve(playerId);
                        }

                        console.log("enable buttons");
                        this.scene.topBarDrawer.setAllButtonsDisabled(false);
                    });
                }
            }];

            if (!this.required) {
                buttons.push({
                    text: "Нет",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        this.scene.topBarDrawer.removeButtons();
                        this.scene.topBarDrawer.clearStatus();

                        resolve(undefined);
                    }
                });
            }

            this.scene.topBarDrawer.addButtons(buttons);
        });


    }

    update() {
        this.modal?.update();
    }

    private showModal() {
        return new Promise<PlayerId | undefined>(resolve => {
            this.modal = new Modal(this.scene);

            this.modal.setTitle("Выберите игрока для атаки");

            for (let player of this.players) {
                this.modal.addLine(player.name).on('click', () => {
                    resolve(player.id);

                    this.modal.destroy();
                });
            }

            this.scene.on('pointerdown.modal', () => {
                const pos = this.scene.getRelativePointerPosition();

                if (!this.modal.backgroundShape.intersects(pos)) {
                    this.scene.off("pointerdown.modal");
                    resolve(undefined);

                    this.modal.destroy();
                }
            });
        });
    }
}