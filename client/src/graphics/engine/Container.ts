import {Node, NodeConfig} from './Node';
import {BoundingRect, merge} from "./types";

export abstract class Container<ChildType extends Node = Node, Config extends NodeConfig = NodeConfig> extends Node {
    children?: Array<ChildType>;

    constructor(config?: Config) {
        super(config);

        this.children = this.children ?? [];
    }

    destroyChildren() {
        this.getChildren().forEach(child => {
            child.parent = undefined;
            child.index = 0;

            child.destroy();
        });

        this.children = [];

        this.requestRedraw();
    }

    destroy() {
        if (this.hasChildren())
            this.destroyChildren();

        super.destroy();

        return this;
    }

    hasChildren() {
        return this.getChildren().length > 0;
    }

    find(selector): Array<ChildType> {
        return this._find(selector, false);
    }

    findOne(selector): ChildType {
        const result = this._find(selector, true);
        return result.length > 0 ? result[0] : undefined;
    }

    private _find(selector, findOne: boolean): ChildType[] {
        const result = [];

        this.descendants(desc => {
            const isValid = desc.isMatch(selector);

            if (isValid)
                result.push(desc);

            return !!(findOne && isValid);
        });

        return result;
    }

    private descendants(fn: (n: Node) => boolean) {
        let shouldStop = false;
        const children = this.getChildren();

        for (const child of children) {
            shouldStop = fn(child);

            if (shouldStop)
                return true;

            if (!child.hasChildren())
                continue;

            shouldStop = (child as any).descendants(fn);

            if (shouldStop)
                return true;
        }

        return false;
    }

    getChildren(): Array<ChildType> {
        return this.children || [];
    }

    add(...children: ChildType[]) {
        if (children.length === 0)
            return this;

        if (children.length > 1) {
            for (const child of children) {
                this.add(child);
            }

            return this;
        }

        const child = children[0];

        if (!child)
            return this;

        if (!this.children)
            this.children = [];

        child.index = this.children.length;
        child.parent = this;

        this.children.push(child);

        this.fire('add', {
            child: child,
        });

        this.requestRedraw();

        return this;
    }

    drawScene() {
        if (!this.isVisible())
            return;

        this.drawChildren('drawScene');
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return;

        this.drawChildren('drawHit');
    }

    getClientRect(relativeTo?: Container<Node>, ignoreStroke?: boolean): BoundingRect | undefined {
        if (!this.visible()) {
            return;
        }

        relativeTo = relativeTo ?? this.getScene();

        let br = new BoundingRect();

        if (this.children.length > 0) {
            this.children?.forEach(child => {
                const cbr = child.getClientRect(this, ignoreStroke);

                if (cbr) {
                    br = merge(br, cbr);
                }
            });
        } else {
            br.top = 0;
            br.bottom = 0;
            br.left = 0;
            br.right = 0;
        }

        return this.transformedRect(br, relativeTo);
    }

    private drawChildren(drawMethod: string) {
        this.children?.forEach(child => {
            child[drawMethod]();
        });
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

        return this.getClientRect(this, true).width;
    }

    getHeight(): number {
        if (this.attrs.height !== undefined)
            return this.attrs.height;

        return this.getClientRect(this, true).height;
    }
}