import typescript from '@rollup/plugin-typescript'
import typescriptPaths from 'rollup-plugin-typescript-paths'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

export default {
  input: 'src/index.ts',
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
    typescript(),
    typescriptPaths(),
    commonjs(),
    nodeResolve({
      preferBuiltins: false
    }),
    json(),
    replace({
      // Workaround for inadequate tree-shaking.
      preventAssignment: true,
      "import cryptoModule__default from 'crypto';": "const cryptoModule__default = cryptoModule;",
      delimiters: ['', '']
    }),
  ],
  external: ["http-request", "create-response", "log", "crypto", "encoding"]
};
