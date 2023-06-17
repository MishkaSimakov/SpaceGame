export const glob: any = window;

export const Draw = {
    glob: glob,

    DRAG_DISTANCE: 3,
    _pointerListenClick: false,
    _mouseListenClick: false,
    _touchListenClick: false,

    _injectGlobal(draw) {
        glob.Draw = draw;
    }
}

export const _registerNode = (NodeClass: any) => {
    Draw[NodeClass.prototype.getClassName()] = NodeClass;
}

Draw._injectGlobal(Draw);
