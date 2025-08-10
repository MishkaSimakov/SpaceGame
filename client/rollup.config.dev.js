import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';

export default [
    // --- Game bundle ---
    {
        input: './src/index.ts',
        output: {
            file: './dist/game.js',
            name: 'MyGame',
            format: 'iife',
            sourcemap: true,
            intro: 'var global = window;'
        },
        plugins: [
            resolve({extensions: ['.ts', '.tsx', '.js', '.css'], browser: true}),
            commonjs({
                sourceMap: true,
                ignoreGlobal: true
            }),
            typescript({
                include: ['./**/*.ts+(|x)', '../common/**/*.ts+(|x)'],
                clean: true
            })
        ]
    },

    // --- Styles JS bundle ---
    {
        input: './src/styles.js',
        output: {
            file: './dist/styles.js',
            format: 'iife',
            sourcemap: true,
            name: 'BootstrapBundle'
        },
        plugins: [
            resolve({extensions: ['.js'], browser: true}),
            commonjs({
                include: ['node_modules/bootstrap/**', 'node_modules/@popperjs/**', ],
                sourceMap: true,
            }),
            postcss({
                extract: 'app.css',
                minimize: true,
                sourceMap: true
            }),
        ]
    }
];
