import Module, {isModule} from "../../../common/modules/Module";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";

function drawModuleCard(scene: Phaser.Scene, module: Module, position: Vector2, cardSize: number, isActivated: boolean = false): Phaser.GameObjects.Container {
    let scale = cardSize / 256;
    let headerFontSize = 25 * scale;
    let textFontSize = 15 * scale;

    let connectorsShapes = [];

    let blueColor = 0x4343FE;
    let redColor = 0xFF2525;

    let mainBackgroundColor = 0x155745;
    let defaultBackgroundColor = 0x95AFBA;

    let color = defaultBackgroundColor;

    if (module.isMain) {
        color = mainBackgroundColor;
    }
    if (isActivated) {
        color = 0x30332E;
    }

    let backgroundShape = scene.add.rectangle(0, 0, cardSize, cardSize, color)

    let moduleNameShape = scene.add.text(0, 0, module.name.split(' '))
        .setStyle({
            fontFamily: 'Exo2Bold',
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
        statusBarText += ' +' + module.energyIncrease + '⚡️';

    if (module.energyCost)
        statusBarText += ' -' + module.energyCost + '⚡️'

    let moduleHealthShape = scene.add.text(0, 50 * scale, statusBarText, {align: 'center'})
        .setStyle({
            fontFamily: 'Exo2Bold',
            fontSize: textFontSize + "px",
            color: '#fff',
            align: 'center'
        })
        .setOrigin(0.5);

    let drawConnector = (isBlue: boolean) => {
        let graphics = scene.add.graphics();
        graphics.fillStyle(isBlue ? blueColor : redColor);

        graphics.fillRoundedRect(-cardSize / 2, -150 * scale / 2, 18 * scale, 150 * scale, {
            tr: 10 * scale,
            br: 10 * scale,
            tl: 0,
            bl: 0
        })

        return graphics
    }

    if (module.connectors.left !== 0) {
        let graphics = drawConnector(module.connectors.left === 1);

        connectorsShapes.push(graphics);
    }

    if (module.connectors.top !== 0) {
        let graphics = drawConnector(module.connectors.top === 1);

        graphics.setRotation(Math.PI / 2);

        connectorsShapes.push(graphics);
    }

    if (module.connectors.right !== 0) {
        let graphics = drawConnector(module.connectors.right === 1);

        graphics.setRotation(Math.PI);

        connectorsShapes.push(graphics);
    }

    if (module.connectors.bottom !== 0) {
        let graphics = drawConnector(module.connectors.bottom === 1);

        graphics.setRotation(-Math.PI / 2);

        connectorsShapes.push(graphics);
    }

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
    let fontSize = 10
    let descriptionShape = scene.add.text(0, 0, description)
        .setStyle({
            align: 'center',
            fontFamily: 'Exo2Regular',
            fontSize: fontSize + 'px'
        })
        .setOrigin(0.5);

    console.log((cardSize - 10 * 2) / descriptionShape.getBounds().width * fontSize);
    descriptionShape.setFontSize((cardSize - 10 * 2) / descriptionShape.getBounds().width * fontSize);

    return scene.add.container(position.x, position.y, [backgroundShape, descriptionShape])
        .setSize(cardSize, cardSize)
        .setInteractive()
        .setData('type', 'event')
        .setData('event', event);
}

export {drawModuleCard, drawEventCard};