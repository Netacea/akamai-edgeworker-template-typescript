import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'tsc_out/index.js',
  output: {
    file: 'main.js',
    format: 'es'
  },
  treeshake: {
    /**
     * Assume that modules do not have side effects
     * & unused imports may be discarded
     */
    moduleSideEffects: false
  },
  plugins: [
    commonjs(),
    nodeResolve({
      preferBuiltins: false
    }),
    json()
  ],
  external: ["http-request", "create-response", "log", "crypto", "encoding"]
};
