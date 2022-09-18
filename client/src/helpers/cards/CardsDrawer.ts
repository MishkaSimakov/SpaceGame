import Module from "../../../../common/modules/Module";
import Vector2 from "../../../../common/Vector2";
import {Event} from "../../../../common/events/Event";

const cardWidth: number = 256;
const cardHeight: number = 256;

function drawModuleCard(scene: Phaser.Scene, module: Module, position: Vector2): Phaser.GameObjects.Container {
    let connectorsShapes = [];

    let backgroundShape = scene.add.rectangle(0, 0, cardWidth, cardHeight, module.isMain ? 0xeb4934 : 0x155745)

    let blue_color = 0x02caf7;
    let red_color = 0xf70202;

    let moduleNameShape = scene.add.text(0, 0, module.name.split(' '), {align: 'center'}).setOrigin(0.5);

    if (module.connectors.left !== 0)
        connectorsShapes.push(
            scene.add.circle(-cardWidth / 2 + 25, 0, 10, module.connectors.left === 1 ? blue_color : red_color)
        );

    if (module.connectors.top !== 0)
        connectorsShapes.push(
            scene.add.circle(0, -cardHeight / 2 + 25, 10, module.connectors.top === 1 ? blue_color : red_color)
        );

    if (module.connectors.right !== 0)
        connectorsShapes.push(
            scene.add.circle(cardWidth / 2 - 25, 0, 10, module.connectors.right === 1 ? blue_color : red_color)
        );

    if (module.connectors.bottom !== 0)
        connectorsShapes.push(
            scene.add.circle(0, cardHeight / 2 - 25, 10, module.connectors.bottom === 1 ? blue_color : red_color)
        );

    return scene.add.container(
        position.x, position.y,
        [backgroundShape, ...connectorsShapes, moduleNameShape]
    )
        .setSize(cardWidth, cardHeight)
        .setInteractive()
        .setData('type', 'module')
        .setData('module', module);
}

function drawEventCard(scene: Phaser.Scene, event: Event, position: Vector2): Phaser.GameObjects.Container {
    let backgroundShape = scene.add.rectangle(0, 0, cardWidth, cardHeight, 0xf8b195);

    let description = event.description;
    let fontSize = 16;
    let symbolsPerLine = (cardWidth - 10) / fontSize;
    let lines: string[] = [];

    while (description.length > 10) {
        let nextWord = description.split(" ")[0];

        if (lines.length === 0 || lines[lines.length - 1].length + nextWord.length + 1 > symbolsPerLine) {
            lines.push(nextWord);
        } else {
            lines[lines.length - 1] += " " + nextWord;
        }

        description = description.substring(nextWord.length + 1);
    }

    let descriptionShape = scene.add.text(0, 0, lines, {align: 'center'}).setOrigin(0.5);

    return scene.add.container(position.x, position.y, [backgroundShape, descriptionShape])
        .setSize(cardWidth, cardHeight)
        .setInteractive()
        .setData('type', 'event')
        .setData('event', event);
}

export {drawModuleCard, drawEventCard};