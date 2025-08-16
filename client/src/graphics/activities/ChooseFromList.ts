import Modal from "../Modal";
import Controls from "../scenes/Controls";
import {Activity} from "./Activity";

export class ChooseFromListActivity extends Activity {
    private modal: Modal;

    constructor(private scene: Controls, private title: string, private values: string[]) {
        super();
    }

    activate(): Promise<number> {
        return new Promise(resolve => {
            this.modal = new Modal(this.scene);

            this.modal.setTitle(this.title);

            for (let index = 0; index < this.values.length; ++index) {
                this.modal.addLine(this.values[index])
                    .on('pointerdown', () => {
                        resolve(index);

                        this.modal.destroy();
                    });
            }
        });
    }

    update() {
        this.modal?.update();
    }
}