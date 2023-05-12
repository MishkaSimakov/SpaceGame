import Module from "../../../common/modules/Module";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";

function drawModuleCard(scene: Phaser.Scene, module: Module, position: Vector2, cardSize: number): Phaser.GameObjects.Container {
    let scale = cardSize / 256;
    let headerFontSize = 25 * scale;
    let textFontSize = 15 * scale;

    let connectorsShapes = [];

    let blueColor = 0x4343FE;
    let redColor = 0xFF2525;

    let mainBackgroundColor = 0xE4D9FF;

    let backgroundShape = scene.add.rectangle(0, 0, cardSize, cardSize, module.isMain ? mainBackgroundColor : 0x155745)

    let moduleNameShape = scene.add.text(0, 0, module.name.split(' '))
        .setStyle({
            fontFamily: 'Exo2',
            fontSize: headerFontSize + "px",
            color: '#fff',
            align: 'center'
        })
        .setOrigin(0.5);

    let statusBarText = '';

    statusBarText += module.health + '/' + module.totalHealth + '❤️';

    if (module.strength)
        statusBarText += ' ' + module.strength + '🎯';

    if (module.capacity)
        statusBarText += ' ' + module.capacity + '🔋';

    if (module.energyIncrease)
        statusBarText += ' ' + module.energyIncrease + '⚡️';

    let moduleHealthShape = scene.add.text(0, 50 * scale, statusBarText, {align: 'center'})
        .setStyle({
            fontFamily: 'Exo2',
            fontSize: textFontSize + "px",
            color: '#fff',
            align: 'center'
        })
        .setOrigin(0.5);

    if (module.connectors.left !== 0)
        connectorsShapes.push(
            scene.add.circle(-cardSize / 2 + 25 * scale, 0, 10 * scale, module.connectors.left === 1 ? blueColor : redColor)
        );

    if (module.connectors.top !== 0)
        connectorsShapes.push(
            scene.add.circle(0, -cardSize / 2 + 25 * scale, 10 * scale, module.connectors.top === 1 ? blueColor : redColor)
        );

    if (module.connectors.right !== 0)
        connectorsShapes.push(
            scene.add.circle(cardSize / 2 - 25 * scale, 0, 10 * scale, module.connectors.right === 1 ? blueColor : redColor)
        );

    if (module.connectors.bottom !== 0)
        connectorsShapes.push(
            scene.add.circle(0, cardSize / 2 - 25 * scale, 10 * scale, module.connectors.bottom === 1 ? blueColor : redColor)
        );

    let moduleContainer = scene.add.container(
        position.x, position.y,
        [backgroundShape, ...connectorsShapes, moduleNameShape, moduleHealthShape]
    )
        .setSize(cardSize, cardSize)
        .setInteractive()
        .setData('type', 'module')
        .setData('module', module);

    moduleContainer.setRotation(Math.PI / 2 * module.rotation);

    return moduleContainer;
}

function drawEventCard(scene: Phaser.Scene, event: Event, position: Vector2, cardSize: number): Phaser.GameObjects.Container {
    let backgroundShape = scene.add.rectangle(0, 0, cardSize, cardSize, 0xf8b195);

    let description = event.description;
    let descriptionShape = scene.add.text(0, 0, description, {align: 'center'}).setOrigin(0.5);

    return scene.add.container(position.x, position.y, [backgroundShape, descriptionShape])
        .setSize(cardSize, cardSize)
        .setInteractive()
        .setData('type', 'event')
        .setData('event', event);
}

export {drawModuleCard, drawEventCard};