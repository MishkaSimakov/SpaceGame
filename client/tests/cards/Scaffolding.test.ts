import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {ModuleCard, ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

// Guards the client test setup itself: that the @common alias resolves, that the shared rules
// layer runs under vitest, and that fast-check is wired up. Every other suite here depends on all
// three, so when they break this fails first and says so plainly.

function module(id: number, x: number, y: number, connectors: ModuleCard["connectors"], type = ModuleType.SolarPanel): ModuleCard {
    return {
        id,
        name: `module-${id}`,
        connectors,
        strength: 0,
        capacity: 0,
        energyCost: 0,
        energyIncrease: 0,
        type,
        totalHealth: 10,
        health: 10,
        x,
        y,
        rotation: 0
    };
}

describe("client test scaffolding", () => {
    it("runs the shared rules layer from @common", () => {
        // Two modules side by side, joined on a matching colour-1 connector.
        const ship: Spaceship = {
            modules: [
                module(1, 0, 0, {top: 0, right: 1, bottom: 0, left: 0}, ModuleType.MainModule),
                module(2, 1, 0, {top: 0, right: 0, bottom: 0, left: 1})
            ]
        };

        expect(SpaceshipGetters.checkConfiguration(ship)).toBe(true);
        expect(SpaceshipGetters.getComponents(ship)).toHaveLength(1);
    });

    it("detects a ship split into two components", () => {
        // Same two modules, but far apart and no longer touching.
        const ship: Spaceship = {
            modules: [
                module(1, 0, 0, {top: 0, right: 1, bottom: 0, left: 0}, ModuleType.MainModule),
                module(2, 5, 0, {top: 0, right: 0, bottom: 0, left: 1})
            ]
        };

        expect(SpaceshipGetters.getComponents(ship)).toHaveLength(2);
        expect(SpaceshipGetters.checkConfiguration(ship)).toBe(false);
    });

    it("runs fast-check properties", () => {
        // A connector never connects to a mismatched colour, at any rotation.
        fc.assert(
            fc.property(
                fc.integer({min: 0, max: 3}),
                fc.integer({min: 0, max: 3}),
                (leftRotation, rightRotation) => {
                    const ship: Spaceship = {
                        modules: [module(1, 0, 0, {top: 0, right: 1, bottom: 0, left: 0}, ModuleType.MainModule)]
                    };
                    ship.modules[0].rotation = leftRotation;

                    const candidate = module(2, 1, 0, {top: 0, right: 0, bottom: 0, left: 2});
                    candidate.rotation = rightRotation;

                    // colour 1 on the left module can never meet colour 2 on the right one
                    const leftConnector = SpaceshipGetters.getConnectorInDirection(ship.modules[0], "right");
                    const rightConnector = SpaceshipGetters.getConnectorInDirection(candidate, "left");

                    if (leftConnector !== rightConnector) {
                        expect(SpaceshipGetters.canConnectModule(ship, candidate, 1, 0)).toBe(false);
                    }
                }
            )
        );
    });
});
