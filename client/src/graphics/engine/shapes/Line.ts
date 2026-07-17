import {Shape, ShapeConfig} from "../Shape";
import {Context} from "../Context";
import {GetSet} from "../types";
import {Factory} from "../Factory";
import {_registerNode} from "../Global";
import {Vector2} from "@common/Types";

export interface LineConfig extends ShapeConfig {
    lineJoin: 'round' | 'bevel' | 'miter',
    points: Vector2[],
    closed: boolean
}

export class Line extends Shape<LineConfig> {
    _sceneFunc(context: Context) {
        const points = this.points();

        context.lineWidth = this.strokeWidth();
        context.lineJoin = this.lineJoin();

        context.beginPath();

        if (points.length >= 2) {
            context.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; ++i) {
                context.lineTo(points[i].x, points[i].y);
            }
        }

        if (this.closed()) {
            context.closePath();
        }

        context.strokeShape(this);
    }

    lineWidth: GetSet<number, this>;
    lineJoin: GetSet<'round' | 'bevel' | 'miter', this>;
    points: GetSet<Vector2[], this>;
    closed: GetSet<boolean, this>;
}

Line.prototype.className = 'Line';
_registerNode(Line);

Factory.addGetterSetter(Line, 'lineWidth', 10);
Factory.addGetterSetter(Line, 'lineJoin', 'miter');
Factory.addGetterSetter(Line, 'points', []);
Factory.addGetterSetter(Line, 'closed', false);
