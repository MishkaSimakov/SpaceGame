import Scene from "../engine/Scene";
import {GraphicsManager} from "../engine/GraphicsManager";
import Color from "../engine/types/Color";

export default class TestScene extends Scene {
    constructor(graphics: GraphicsManager) {
        super(graphics);

        let rect = this.rect(10, 30, 300, 2).setFillStyle(Color.YELLOW);

        let container = this.container();

        let startX = 0;

        container.add(
            this.text(0, 0, "✖️ Simakovkin:")
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.BLACK)
                .setOrigin(0, 1)
        );

        startX += 150;

        container.add(
            this.text(startX, 0, `10/100 ⚡️`)
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.BLACK)
                .setOrigin(0, 1)
        );

        container.add(
            this.text(startX + 75, 0, `0 🤚`)
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.BLACK)
                .setOrigin(0, 1)
        );

        container.add(
            this.text(startX + 150, 0, `5:00 ⏰`)
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.BLACK)
                .setOrigin(0, 1)
        );

        container.setPosition(0, 30);

        rect.destroy();
        container.destroy();
    }
}
