import {Node} from './Node';
import {Vector2} from "./types";
import {Draw} from "./Global";

export const DD = {
    _dragElements: new Map<
        number,
        {
            node: Node,
            startPointerPos: Vector2,
            offset: Vector2,
            pointerId: number,

            dragStatus: 'ready' | 'dragging' | 'stopped'
        }
    >(),
    get isDragging(): boolean {
          DD._dragElements.forEach(element => {
                if (element.dragStatus === 'dragging')
                    return true;
          });

          return false;
    },

    _drag(evt) {
        const nodesToFireEvents: Array<Node> = [];

        DD._dragElements.forEach((element, key) => {
            const {node} = element;
            const graphics = node.getGraphics();

            graphics.updatePointerPosition(evt);

            const pos = graphics._changedPointerPositions.find(
                pos => pos.id === element.pointerId
            );

            if (!pos)
                return;

            if (element.dragStatus !== 'dragging') {
                let dragDistance = node.getDragDistance();
                let distance = Math.sqrt(
                    Math.pow(pos.x - element.startPointerPos.x, 2) +
                    Math.pow(pos.y - element.startPointerPos.y, 2)
                );

                if (distance < dragDistance)
                    return;

                node.startDrag({ evt });
            }

            node.setDragPosition(evt, element);
            nodesToFireEvents.push(node);
        });

        nodesToFireEvents.forEach((node) => {
            node.fire(
                'dragmove',
                {
                    type: 'dragmove',
                    target: node,
                    evt: evt
                }, true
            );
        })
    },
    _endDrag(evt) {
        DD._dragElements.forEach((element, key) => {
            const {node} = element;
            const graphics = node.getGraphics();

            if (evt)
                graphics.updatePointerPosition(evt);

            const pos = graphics._changedPointerPositions.find(
                pos => pos.id === element.pointerId
            );

            if (!pos)
                return;

            if (element.dragStatus === 'dragging' || element.dragStatus === 'stopped') {
                Draw._mouseListenClick = false;
                Draw._pointerListenClick = false;
                Draw._touchListenClick = false;

                node.fire('dragend', {
                    type: 'dragend',
                    target: node,
                    evt
                }, true);

                DD._dragElements.delete(key);
            }
        });
    }
}

window.addEventListener('mousemove', DD._drag);
window.addEventListener('touchmove', DD._drag);

window.addEventListener('mouseup', DD._endDrag, false);
window.addEventListener('touchend', DD._endDrag, false);
