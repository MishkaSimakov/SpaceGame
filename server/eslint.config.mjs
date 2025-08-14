// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: ["variableLike", "memberLike"],
                    format: ["camelCase"],
                },
            ],
            "semi": ["error", "always"],
            "@typescript-eslint/no-explicit-any": "off"
        },
    }
);