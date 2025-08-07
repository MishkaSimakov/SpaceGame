import {MoveDamageReason} from "@common/Types";
import Vector2 from "@common/Vector2";

import {Activity} from "./Activity";
import Controls from "../scenes/Controls";
import Spaceships from "../scenes/Spaceships";
import {Button} from "../shapes/Button";
import {Boundary} from "../CountBoundary";
import Color from "../Color";
import {COLORS} from "../constants";

type MoveDamageResult = Partial<{ from: Vector2, to: Vector2 }>;

const reasonStatus: Record<MoveDamageReason, string> = {
    [MoveDamageReason.MainModule]: "выберите, откуда переместить урон",
    [MoveDamageReason.EventCard]: "выберите, откуда переместить урон"
}

export class ChooseModulesToMoveDamage extends Activity {
    constructor(private controlsScene: Controls, private spaceshipsScene: Spaceships, private reason: MoveDamageReason) {
        super();
    }

    activate(): Promise<MoveDamageResult> {
        this.controlsScene.topBarDrawer.setStatus(reasonStatus[this.reason]);

        const fromHandle = this.spaceshipsScene.chooseModules(
            ({
                 module,
                 player
             }) => player === this.controlsScene.gameManager.getCurrentPlayer().id && module.health !== module.totalHealth,
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            (this.controlsScene.topBarDrawer.buttonsGroup.children[0] as Button).disabled(
                fromHandle.get().length !== 1
            );
        };

        fromHandle.onSet(validate);

        return new Promise<MoveDamageResult>(resolve => {
            this.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const from = Vector2.modulePosition(fromHandle.get()[0].module);

                    this.spaceshipsScene.endChoosingModule();
                    this.controlsScene.topBarDrawer.removeButtons();

                    this.chooseDestination().then(to => {
                        resolve({from, to});
                    });
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve({from: undefined, to: undefined});
                }
            }]);

            validate();
        });
    }

    update(): void {
    }

    private async chooseDestination() {
        this.controlsScene.topBarDrawer.setStatus("выберите, куда переместить урон");

        const toHandle = this.spaceshipsScene.chooseModules(
            ({player}) => player === this.controlsScene.gameManager.getCurrentPlayer().id,
            Boundary.equal(1),
            Color.fromHex('a3b18a')
        );

        const validate = () => {
            this.controlsScene.topBarDrawer.setButtonsDisabled(toHandle.get().length !== 1);
        };

        toHandle.onSet(validate);

        const to = await new Promise<Vector2>(resolve => {
            this.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(Vector2.modulePosition(toHandle.get()[0].module));
                }
            }]);

            validate();
        });

        this.spaceshipsScene.endChoosingModule();
        this.controlsScene.topBarDrawer.removeButtons();

        return to;
    }
}