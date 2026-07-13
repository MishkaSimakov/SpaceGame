import {Node} from './Node';
import {Vector2} from "./types";
import {Draw} from "./Global";

export const DD = {
    _dragElements: new Map<
        number,
        {
            node: Node,
            startPointerPos: Vector2,
            startPos: Vector2,
            offset: Vector2,
            pointerId: number,

            followPointer: boolean,
            dragStatus: 'ready' | 'dragging' | 'stopped',
        }
    >(),
    isDragging(): boolean {
        let isDragging = false;
        DD._dragElements.forEach(element => {
            if (element.dragStatus === 'dragging' || element.dragStatus === 'ready')
                isDragging = true;
        });

        return isDragging;
    },
    getDragElement(node: Node) {
        return DD._dragElements.get(node._id);
    },
    _drag(evt) {
        evt.preventDefault();

        const nodesToFireEvents: Array<Node> = [];

        DD._dragElements.forEach(element=> {
            const {node} = element;
            const graphics = node.getGraphics();

            graphics.updatePointerPosition(evt);

            const pos = graphics._changedPointerPositions.find(
                pos => pos.id === element.pointerId
            );

            if (!pos)
                return;

            if (element.dragStatus !== 'dragging') {
                const dragDistance = node.getDragDistance();
                const distance = Math.sqrt(
                    Math.pow(pos.x - element.startPointerPos.x, 2) +
                    Math.pow(pos.y - element.startPointerPos.y, 2)
                );

                if (distance < dragDistance)
                    return;

                node.startDrag({evt});
            }

            if (element.followPointer) {
                node.setDragPosition(evt, element);
            }

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
        });
    },
    _endDragBefore(evt) {
        const drawNodes = [];

        DD._dragElements.forEach(element => {
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

                element.dragStatus = 'stopped';
            }

            const drawNode = node.getScene();

            if (node.getScene() && drawNodes.indexOf(drawNode) === -1) {
                drawNodes.push(drawNode);
            }
        });

        drawNodes.forEach(node => {
            node.draw();
        });
    },
    _endDragAfter(evt) {
        DD._dragElements.forEach((element, key) => {
            if (element.dragStatus === 'stopped') {
                element.node.fire('dragend', {
                    evt: evt,
                    type: 'dragend',
                    target: element.node
                });
            }
            if (element.dragStatus !== 'dragging') {
                DD._dragElements.delete(key);
            }
        });
    }
};

window.addEventListener('mouseup', DD._endDragBefore, true);
window.addEventListener('touchend', DD._endDragBefore, true);

window.addEventListener('mousemove', DD._drag);
window.addEventListener('touchmove', DD._drag);

window.addEventListener('mouseup', DD._endDragAfter, false);
window.addEventListener('touchend', DD._endDragAfter, false);
