// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        // build output: generated bundles, not sources
        ignores: ["dist/"],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    // A leading underscore marks a member as internal to the graphics engine
                    // (`_sceneFunc`, `_hitFunc`, `_registerNode`). It is the engine's only
                    // visibility marker: these are called across files, so they cannot be `private`.
                    selector: ["variableLike", "memberLike"],
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
                {
                    // Keys such as "@common" (path alias) and "@typescript-eslint/no-explicit-any"
                    // (ESLint rule id) are names owned by other tools. They must be quoted and
                    // cannot be camelCase.
                    selector: "objectLiteralProperty",
                    modifiers: ["requiresQuotes"],
                    format: null,
                },
                {
                    // Enum members are constants.
                    selector: "enumMember",
                    format: ["UPPER_CASE"],
                },
                {
                    // The constants tree in graphics/constants.ts: COLORS.BUTTON.PRIMARY.HOVER, and
                    // the type that describes it. Constants all the way down, so the keys are too.
                    // Leading underscore for the same reason as members: Draw._pointerListenClick
                    // and Drag._dragElements are engine internals living on a namespace object.
                    selector: ["objectLiteralProperty", "typeProperty"],
                    format: ["camelCase", "UPPER_CASE"],
                    leadingUnderscore: "allow",
                },
                {
                    // Module-level const singletons: constants (UPPER_CASE), and the namespace-like
                    // objects the engine groups its free functions under — Draw, Factory, Utils.
                    // Deliberately limited to `global` so a const inside a function still has to be
                    // camelCase.
                    selector: "variable",
                    modifiers: ["const", "global"],
                    format: ["camelCase", "UPPER_CASE", "PascalCase"],
                    leadingUnderscore: "allow",
                },
                {
                    // Static singletons standing in for constants.
                    selector: "classProperty",
                    modifiers: ["static"],
                    format: ["camelCase", "UPPER_CASE"],
                },
                {
                    selector: "parameter",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {args: "after-used", argsIgnorePattern: "^_"},
            ],
            "semi": ["error", "always"],
            "@typescript-eslint/no-explicit-any": "off"
        },
    }
);
