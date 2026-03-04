import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace';

const config = {
    input: "src/index.js",
    output: {
        esModule: true,
        file: "dist/index.js",
        format: "es",
        sourcemap: false,
    },
    plugins: [
        replace({
            preventAssignment: true,
            __VERSION__: process.env.VERSION || '0.0.0',
        }),
        commonjs(),
        nodeResolve({ preferBuiltins: true }),
    ],
};

export default config;