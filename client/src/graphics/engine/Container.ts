import {Node} from './Node';
import {BoundingRect} from "./types";

export abstract class Container<ChildType extends Node = Node> extends Node {
    children?: Array<ChildType> = [];

    getChildren(): Array<ChildType> {
        return this.children;
    }

    add(...children: ChildType[]) {
        if (children.length === 0)
            return this;

        if (children.length > 1) {
            for (let child of children) {
                this.add(child);
            }

            return this;
        }

        const child = children[0];

        child.index = this.children.length;
        child.parent = this;

        this.children.push(child);

        this.requestRedraw();

        return this;
    }

    drawScene() {
        this.drawChildren('drawScene');
    }

    drawHit() {
        this.drawChildren('drawHit');
    }

    getClientRect(relativeTo?: Container<Node>): BoundingRect {
        relativeTo = relativeTo ?? this.getScene();

        let br = new BoundingRect();

        this.children?.forEach(child => {
            let cbr = child.getClientRect(this);

            br.top = Math.min(br.top, cbr.top);
            br.bottom = Math.max(br.bottom, cbr.bottom);
            br.left = Math.min(br.left, cbr.left);
            br.right = Math.max(br.right, cbr.right);
        });

        return this.transformedRect(br, relativeTo);
    }

    private drawChildren(drawMethod: string) {
        this.children?.forEach(child => {
            child[drawMethod]();
        })
    }

    setChildrenIndices() {
        if (!this.children)
            return;

        this.children.forEach((child, index) => {
            child.index = index;
        });

        this.requestRedraw();
    }

    isAncestorOf(node: Node): boolean {
        let parent = node.getParent();

        while (parent) {
            if (parent._id === this._id) {
                return true;
            }

            parent = parent.getParent();
        }

        return false;
    }

    getWidth(): number {
        if (this.attrs.width !== undefined)
            return this.attrs.width;

        return this.getClientRect(this).width;
    }

    getHeight(): number {
        if (this.attrs.height !== undefined)
            return this.attrs.height;

        return this.getClientRect(this).height;
        // if (!this.children)
        //     return 0;
        //
        // let minY = Infinity, maxY = 0;
        //
        // this.children.forEach(child => {
        //     let clRect = child.getClientRect(this);
        //
        //     minY = Math.min(minY, clRect.top);
        //     maxY = Math.max(maxY, clRect.bottom);
        // });
        //
        // return maxY - minY;
    }
}
