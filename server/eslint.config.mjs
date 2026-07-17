// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                // Type-aware rules (no-floating-promises et al.) need the type checker,
                // which requires the parser to resolve each file to a tsconfig.
                // vitest.config.ts is outside tsconfig's include, so it rides the
                // default project rather than failing to resolve.
                projectService: {
                    allowDefaultProject: ["vitest.config.ts"],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: ["variableLike", "memberLike"],
                    format: ["camelCase"],
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
                    // Enum members are constants (GameStatus.ACTIVE, ActionPurpose.SAGA_INPUT).
                    selector: "enumMember",
                    format: ["UPPER_CASE"],
                },
                {
                    // Module-level const singletons used as constants (PrimitiveType tokens in the
                    // codegen). Deliberately limited to `global` so a const inside a function still
                    // has to be camelCase.
                    selector: "variable",
                    modifiers: ["const", "global"],
                    format: ["camelCase", "UPPER_CASE"],
                },
                {
                    // Static singletons standing in for constants: PrimitiveType.NUMBER, .STRING, …
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
            "@typescript-eslint/no-explicit-any": "off",

            // Robustness: an unhandled promise rejection crashes the process, so a
            // dropped `.catch`/`await` on an async call must be an error.
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",

            // Each `!` is a latent crash if the value is actually null/undefined.
            "@typescript-eslint/no-non-null-assertion": "warn",
        },
    }
);