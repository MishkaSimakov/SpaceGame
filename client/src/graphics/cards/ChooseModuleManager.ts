import {ModuleCard, PlayerId, Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import {Observable} from "@common/Observable";

import {BoundaryType, CountBoundary} from "../CountBoundary";
import Color from "@common/helpers/Color";
import {CardInfo} from "./CardInfo";

import * as assert from "assert"

type SelectedModuleInfo = {
    module: ModuleCard,
    player: PlayerId
}

export class ChooseModuleManager {
    private readonly handle: Observable<SelectedModuleInfo[]>;
    private selected: CardInfo[] = [];

    constructor(
        private check: (info: SelectedModuleInfo) => boolean,
        private count: CountBoundary,
        private strokeColor: Color
    ) {
        this.handle = new Observable<SelectedModuleInfo[]>([]);
    }

    onClick(info: CardInfo) {
        assert.ok(info.location.type === "chunk");

        const module = CardGetters.asModule(info.card);

        assert.ok(this.check({player: info.location.chunk.owner, module: module}));

        info.shape.moveToTop();

        const isSelected = this.selected.includes(info);

        if (this.reachedUpperBound() && !isSelected) {
            this.deselect(this.selected[this.selected.length - 1]);
        }

        if (this.reachedLowerBound() && isSelected) {
            return;
        }

        if (isSelected) {
            this.deselect(info);
        } else {
            this.select(info);
        }

        this.updateHandle();
    }

    canChooseModule(info: CardInfo): boolean {
        assert.ok(info.location.type === "chunk");

        return this.check({player: info.location.chunk.owner, module: CardGetters.asModule(info.card)!});
    }

    getHandle(): Observable<SelectedModuleInfo[]> {
        return this.handle;
    }

    deactivate() {
        for (const info of this.selected) {
            this.deselect(info);
        }
    }

    private isEqual(left: { player: PlayerId, position: Vector2 }, right: { player: PlayerId, position: Vector2 }) {
        return left.player === right.player && left.position.x === right.position.x && left.position.y === right.position.y;
    }

    private reachedUpperBound() {
        return (this.count.type === BoundaryType.NO_MORE_THAN || this.count.type === BoundaryType.EQUAL) && this.selected.length === this.count.count;
    }

    private reachedLowerBound() {
        return (this.count.type === BoundaryType.AT_LEAST || this.count.type === BoundaryType.EQUAL) && this.selected.length === this.count.count;
    }

    private deselect(info: CardInfo) {
        info.shape.strokeWidth(0);

        this.selected = this.selected.filter(s => s !== info);
    }

    private select(info: CardInfo) {
        info.shape.strokeWidth(5).stroke(this.strokeColor.toString());
        this.selected.push(info);
    }

    private updateHandle() {
        this.handle.set(this.selected.map(info => {
            assert.ok(info.location.type === "chunk");

            return {
                player: info.location.chunk.owner,
                module: CardGetters.asModule(info.card)
            };
        }))
    }
}