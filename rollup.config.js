import typescript from '@rollup/plugin-typescript'
import typescriptPaths from 'rollup-plugin-typescript-paths'
import json from '@rollup/plugin-json'
import inject from '@rollup/plugin-inject'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import path from "path"

const rootDir = path.resolve(__dirname, "../../")

export default {
  input: 'src/index.ts',
  output: {
    file: 'main.js',
    format: 'es'
  },
  
  plugins: [
    typescript(),
    typescriptPaths(),
    commonjs(),
    nodeResolve({
      preferBuiltins: false
    }),
    alias({
      entries: [
        { find: 'crypto', replacement: path.resolve(rootDir, "integrations/akamai/src/crypto_polyfill") },
        { find: 'buffer', replacement: path.resolve("./node_modules/buffer") }
      ]
    }),    
    json(),
  ],
  external: ["http-request", "create-response", "log"]
};