import {Node} from "konva/lib/Node";
import {Rect} from "konva/lib/shapes/Rect";
import Color from "../Color";

function getNodesBoundingBox(nodes: Node[]) {
    if (nodes.length === 0) return {x: 0, y: 0, width: 0, height: 0};

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        const box = node.getClientRect({relativeTo: node.getStage()});
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
    });

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}


export function getBackground(...nodes: Node[]): Rect {
    const bb = getNodesBoundingBox(nodes);
    const offset = 10;

    return new Rect({
        x: bb.x - offset,
        y: bb.y - offset,
        width: bb.width + 2 * offset,
        height: bb.height + 2 * offset,

        fill: Color.fromHex('#0B2545', 0.75).toString(),
        stroke: Color.fromHex('#3D76BE').toString(),
        strokeWidth: 2
    });
}