import {expect, it} from "vitest";

import * as Actions from "@common/Actions";

import {Cheats, signatures} from "../../src/Cheats";

/**
 * Cheats is driven by hand from the browser console, so `signatures` is the only documentation its
 * user can read. Documentation nobody maintains is worse than none, and the compiler cannot help:
 * the strings are opaque to it.
 *
 * The set of cheats is not this file's to decide — it is whatever `cheat*` action creators the
 * server generates from Actions.yaml. So that is what we compare against: a cheat added there must
 * reach the console with a method and a signature, or this fails.
 */
const cheatActionNames = Object.keys(Actions).filter(name => name.startsWith("cheat"));

const methodNameOf = (actionName: string) => {
    const withoutPrefix = actionName.slice("cheat".length);

    return withoutPrefix[0].toLowerCase() + withoutPrefix.slice(1);
};

it("knows about every cheat the server defines", () => {
    expect(cheatActionNames.length).toBeGreaterThan(0);

    for (const actionName of cheatActionNames) {
        const method = methodNameOf(actionName);

        expect(Cheats.prototype[method as keyof Cheats], `Cheats has no method ${method}`)
            .toBeTypeOf("function");
    }
});

it("documents every cheat it exposes", () => {
    for (const actionName of cheatActionNames) {
        const method = methodNameOf(actionName);

        expect(signatures, `${method} is undocumented`).toHaveProperty(method);
    }
});

// A signature that names a different method than the one it documents sends the reader looking for
// a method that does not exist.
it("names the method it documents", () => {
    for (const [method, signature] of Object.entries(signatures)) {
        expect(signature.startsWith(`${method}(`), `${method}: ${signature}`).toBeTruthy();
    }
});

it("documents nothing that is not a cheat", () => {
    const methods = cheatActionNames.map(methodNameOf);

    for (const method of Object.keys(signatures)) {
        expect(methods, `${method} is documented but is not a cheat`).toContain(method);
    }
});
