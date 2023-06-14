import Scene from "./Scene";
import {Rectangle, RectangleConfig} from "./shapes/Rectangle";
import {Text, TextConfig} from "./shapes/Text";
import {ShapeConfig} from "./Shape";
import {Group} from "./Group";

export class SceneShapeFactory {
    scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    rectangle(config?: RectangleConfig): Rectangle {
        let rect = new Rectangle(config);

        this.scene.add(rect);

        return rect;
    }

    text(config?: TextConfig): Text {
        let text = new Text(config);

        this.scene.add(text);

        return text;
    }

    group(config?: ShapeConfig): Group {
        let group = new Group(config);

        this.scene.add(group);

        return group;
    }
}
