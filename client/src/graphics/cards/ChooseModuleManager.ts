import {ModuleCard, PlayerId} from "@common/Types";
import {Observable} from "@common/Observable";
import Color from "@common/helpers/Color";

import * as assert from "../../assert";
import {BoundaryType, CountBoundary} from "../CountBoundary";
import {FieldCard} from "./CardInfo";

type SelectedModuleInfo = {
    module: ModuleCard,
    player: PlayerId
};

export class ChooseModuleManager {
    private readonly handle: Observable<SelectedModuleInfo[]>;
    private selected: FieldCard[] = [];

    constructor(
        private check: (info: SelectedModuleInfo) => boolean,
        private count: CountBoundary,
        private strokeColor: Color
    ) {
        this.handle = new Observable<SelectedModuleInfo[]>([]);
    }

    onClick(card: FieldCard) {
        assert.ok(this.canChooseModule(card));

        card.shape.moveToTop();

        const isSelected = this.isSelected(card);

        if (this.reachedUpperBound() && !isSelected) {
            this.deselect(this.selected[this.selected.length - 1]);
        }

        if (this.reachedLowerBound() && isSelected) {
            return;
        }

        if (isSelected) {
            this.deselect(card);
        } else {
            this.select(card);
        }

        this.updateHandle();
    }

    canChooseModule(card: FieldCard): boolean {
        return this.check({player: card.player, module: card.module});
    }

    getHandle(): Observable<SelectedModuleInfo[]> {
        return this.handle;
    }

    deactivate() {
        for (const card of Array.from(this.selected)) {
            this.deselect(card);
        }
    }

    private isSelected(card: FieldCard): boolean {
        return this.selected.some(s => s.id === card.id);
    }

    private reachedUpperBound() {
        return (this.count.type === BoundaryType.NO_MORE_THAN || this.count.type === BoundaryType.EQUAL)
            && this.selected.length === this.count.count;
    }

    private reachedLowerBound() {
        return (this.count.type === BoundaryType.AT_LEAST || this.count.type === BoundaryType.EQUAL)
            && this.selected.length === this.count.count;
    }

    private deselect(card: FieldCard) {
        card.shape.strokeWidth(0);

        this.selected = this.selected.filter(s => s.id !== card.id);
    }

    private select(card: FieldCard) {
        card.shape.strokeWidth(5).stroke(this.strokeColor.toString());
        this.selected.push(card);
    }

    private updateHandle() {
        this.handle.set(this.selected.map(card => ({
            player: card.player,
            module: card.module
        })));
    }
}
