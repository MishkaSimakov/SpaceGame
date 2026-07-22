import assert from "node:assert";
import fs from "fs";

import * as jtd from "jtd";
import {afterEach, describe, expect, test, vi} from "vitest";

import {loadData} from "@src/tools/codegen/common/LoadData";
import {basePath} from "@src/helpers/Paths";

describe("loadData", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("returns both the actions and the types from the data files", () => {
        const {actions, types} = loadData();

        expect(Array.isArray(actions)).toBe(true);
        expect(actions.length).toBeGreaterThan(0);
        expect(typeof types).toBe("object");
        expect(Object.keys(types).length).toBeGreaterThan(0);
    });

    test("every returned type definition forms a valid jtd schema", () => {
        const {types} = loadData();

        expect(jtd.isValidSchema({definitions: types})).toBe(true);
        expect(types).toHaveProperty("ModuleType");
        expect(types).toHaveProperty("Vector2");
    });

    test("actions carry a name and a payload, and each payload argument names a type", () => {
        const {actions} = loadData();

        const initGameState = actions.find((action) => action.name === "initGameState");
        expect(initGameState).toBeDefined();

        for (const action of actions) {
            expect(typeof action.name).toBe("string");
            expect(action.name.length).toBeGreaterThan(0);
            expect(Array.isArray(action.payload)).toBe(true);

            for (const argument of action.payload) {
                expect(typeof argument.name).toBe("string");
                expect(argument.type).toBeDefined();
            }
        }
    });

    test("throws when the types schema is invalid", () => {
        const typesFilepath = basePath("server/src/data/Types.yaml");
        const realReadFileSync = fs.readFileSync;

        vi.spyOn(fs, "readFileSync").mockImplementation(((path: fs.PathOrFileDescriptor, options: any) => {
            if (path === typesFilepath) {
                return "SomeType:\n  type: notARealType\n";
            }
            return (realReadFileSync as any)(path, options);
        }) as typeof fs.readFileSync);

        expect(() => loadData()).toThrow(/Invalid types schema/);
    });

    test("preserves an action's meta arguments alongside its payload", () => {
        const {actions} = loadData();

        const beginFight = actions.find((action) => action.name === "beginFight");
        assert.ok(beginFight);
        expect(Array.isArray(beginFight.meta)).toBe(true);
        expect(beginFight.meta.length).toBeGreaterThan(0);

        for (const metaArgument of beginFight.meta) {
            expect(typeof metaArgument.name).toBe("string");
            expect(metaArgument.type).toBeDefined();
        }
    });

    test("throws when an action meta references an invalid type schema", () => {
        const actionsFilepath = basePath("server/src/data/Actions.yaml");
        const realReadFileSync = fs.readFileSync;

        vi.spyOn(fs, "readFileSync").mockImplementation(((path: fs.PathOrFileDescriptor, options: any) => {
            if (path === actionsFilepath) {
                return "- name: brokenAction\n  payload: []\n  meta:\n    - name: bad\n      type:\n        type: notARealType\n";
            }
            return (realReadFileSync as any)(path, options);
        }) as typeof fs.readFileSync);

        expect(() => loadData()).toThrow(/Invalid type schema for action meta \(brokenAction:bad\)/);
    });

    test("throws when an action payload references an invalid type schema", () => {
        const actionsFilepath = basePath("server/src/data/Actions.yaml");
        const realReadFileSync = fs.readFileSync;

        vi.spyOn(fs, "readFileSync").mockImplementation(((path: fs.PathOrFileDescriptor, options: any) => {
            if (path === actionsFilepath) {
                return "- name: brokenAction\n  payload:\n    - name: bad\n      type:\n        type: notARealType\n";
            }
            return (realReadFileSync as any)(path, options);
        }) as typeof fs.readFileSync);

        expect(() => loadData()).toThrow(/Invalid type schema for action payload \(brokenAction:bad\)/);
    });
});
