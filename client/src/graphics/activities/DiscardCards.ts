import {Event} from "@common/events/Event";
import Module, {isModule} from "@common/modules/Module";

import Modal from "../Modal";
import Controls from "../scenes/Controls";
import {Activity} from "./Activity";

export class DiscardCardsActivity extends Activity {
    private modal: Modal;

    constructor(private scene: Controls, private cards: (Module | Event)[], private requiredCount: number) {
        super();
    }

    activate() {
        return new Promise<number[]>(resolve => {
            let selected: number[] = [];

            this.modal = new Modal(this.scene);

            this.modal.setTitle("Выберите, какие карты скинуть");

            for (let [index, card] of Object.entries(this.cards)) {
                let line = this.modal.addLine(isModule(card) ? card.name : card.description);

                line.on('pointerdown', () => {
                    if (selected.indexOf(parseInt(index)) !== -1) {
                        selected = selected.filter((s) => s !== parseInt(index));

                        line.text(line.text().slice(2, -2));
                    } else {
                        selected.push(parseInt(index));

                        line.text("- " + line.text() + " -");
                    }
                });
            }

            this.modal.setBottomText("Скинуть").on('pointerdown', () => {
                if (selected.length < this.requiredCount) return;

                resolve(selected);

                this.modal.destroy();
            });
        });
    }

    update() {
        this.modal.update();
    }
}