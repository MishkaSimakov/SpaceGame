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

    constructor(private scene: Controls, private players: OtherPlayer[], private attackReason: AttackReason) {
        super();
    }

    activate(): Promise<number> {
        return new Promise((resolve: (playerId?: number) => void) => {
            this.scene.topBarDrawer.setStatus(reasonStatus[this.attackReason]);

            const buttons = [{
                text: this.showNoButton() ? "Да" : "Выбрать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    this.scene.topBarDrawer.setButtonsDisabled(true);

                    this.showModal().then(playerId => {
                        if (playerId !== undefined) {
                            this.scene.topBarDrawer.removeButtons();
                            this.scene.topBarDrawer.clearStatus();

                            resolve(playerId);
                        }

                        this.scene.topBarDrawer.setButtonsDisabled(false);
                    });
                }
            }];

            if (this.showNoButton()) {
                buttons.push({
                    text: "Нет",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        this.scene.topBarDrawer.removeButtons();
                        this.scene.topBarDrawer.clearStatus();

                        resolve();
                    }
                });
            }

            this.scene.topBarDrawer.addButtons(buttons);
        });


    }

    update() {
        this.modal?.update();
    }

    private showNoButton() {
        return this.attackReason != AttackReason.AttackAnyEventCard
            && this.attackReason != AttackReason.UsingAttackModuleSecondTime
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

            const graphics = this.scene.getGraphics();

            graphics.on('pointerdown.modal', () => {
                const pos = this.scene.getRelativePointerPosition();

                if (!this.modal.backgroundShape.getClientRect().contains(pos)) {
                    graphics.off("pointerdown.modal");
                    resolve(undefined);

                    this.modal.destroy();
                }
            });
        });
    }
}