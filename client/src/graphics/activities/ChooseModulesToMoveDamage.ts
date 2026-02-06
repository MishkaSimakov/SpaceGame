import {MoveDamageReason, Vector2} from "@common/Types";

import {Activity} from "./Activity";
import Controls from "../scenes/Controls";
import Spaceships from "../scenes/Spaceships";
import {Boundary} from "../CountBoundary";
import Color from "../Color";
import {COLORS} from "../constants";
import {ModuleGetters} from "@common/getters/Module";

type MoveDamageResult = { source: Vector2, destination: Vector2 } | undefined;

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
            this.controlsScene.topBarDrawer.setButtonDisabled('continue', fromHandle.get().length !== 1);
        };

        fromHandle.subscribe(validate);

        return new Promise<MoveDamageResult>(resolve => {
            this.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const from = ModuleGetters.position(fromHandle.get()[0].module);

                    this.spaceshipsScene.endChoosingModule();
                    this.controlsScene.topBarDrawer.removeButtons();
                    this.controlsScene.topBarDrawer.clearStatus();

                    this.chooseDestination().then(to => {
                        resolve({source: from, destination: to});
                    });
                },
                name: 'continue'
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(undefined);
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
            this.controlsScene.topBarDrawer.setButtonDisabled('continue', toHandle.get().length !== 1);
        };

        toHandle.subscribe(validate);

        const to = await new Promise<Vector2>(resolve => {
            this.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(ModuleGetters.position(toHandle.get()[0].module));
                },
                name: 'continue'
            }]);

            validate();
        });

        this.spaceshipsScene.endChoosingModule();
        this.controlsScene.topBarDrawer.removeButtons();

        return to;
    }
}