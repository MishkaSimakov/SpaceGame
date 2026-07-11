import {describe, expect, it} from "vitest";
import * as fs from "fs";
import * as path from "path";

const MODEL_DIR = path.resolve(__dirname, "../../src/graphics/cards/model");

/**
 * The board model must stay free of graphics: the moment it can reach the engine, it can no longer
 * run without a canvas and every property suite over it becomes untestable.
 *
 * This is a test rather than a lint rule only because the client has no ESLint setup.
 */
const FORBIDDEN = [
    "engine",       // Node, Group, Shape, Scene, Drag, ...
    "shapes",       // CardShape and friends
    "scenes",
    "konva",
    "CardsManager"  // the view — the dependency only ever points model <- view
];

function modelFiles(): string[] {
    return fs.readdirSync(MODEL_DIR)
        .filter(f => f.endsWith(".ts"))
        .map(f => path.join(MODEL_DIR, f));
}

function importsOf(source: string): string[] {
    // matches `from "..."` in both import and re-export position
    return Array.from(source.matchAll(/from\s+["']([^"']+)["']/g)).map(m => m[1]);
}

describe("board model purity", () => {
    it("has model files to check", () => {
        expect(modelFiles().length).toBeGreaterThan(0);
    });

    it("never imports the graphics engine", () => {
        const violations: string[] = [];

        for (const file of modelFiles()) {
            const source = fs.readFileSync(file, "utf8");

            for (const specifier of importsOf(source)) {
                if (FORBIDDEN.some(forbidden => specifier.includes(forbidden))) {
                    violations.push(`${path.basename(file)} imports "${specifier}"`);
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it("does not touch browser globals", () => {
        // localStorage belongs in the view/persistence seam, not the model itself.
        const violations: string[] = [];

        for (const file of modelFiles()) {
            const source = fs.readFileSync(file, "utf8");

            for (const global of ["localStorage", "document", "window"]) {
                if (new RegExp(`\\b${global}\\b`).test(source)) {
                    violations.push(`${path.basename(file)} references ${global}`);
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
