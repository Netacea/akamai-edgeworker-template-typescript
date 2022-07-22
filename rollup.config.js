import typescript from '@rollup/plugin-typescript'
import typescriptPaths from 'rollup-plugin-typescript-paths'
import json from '@rollup/plugin-json'
import inject from '@rollup/plugin-inject'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import path from "path"

export default {
  input: 'src/index.ts',
  output: {
    file: 'main.js',
    format: 'es'
  },
  
  plugins: [
    typescript(),
    typescriptPaths(),
    replace({
      "const response = await (0, http_request_1.httpRequest)(path, {": "const response = await httpRequest(path, {",
      "import require$$2 from 'http-request';": "import { httpRequest} from 'http-request';",
      "import require$$3 from 'log';": "import { logger } from 'log';",
      "const log_1 = require$$3;": "const log_1 = logger ;",
      delimiters: ['', '']
    }),
    commonjs(),
    replace({
      "import 'http-request';": "import { httpRequest} from 'http-request';",
      "import 'log';": "import { logger } from 'log';",
      delimiters: ['', '']
    }),
    

    nodeResolve({
      preferBuiltins: false
    }),
    alias({
      entries: [
        { find: 'crypto', replacement: path.resolve("./node_modules/@netacea/akamai/dist/src/crypto_polyfill.js") },
        { find: 'buffer', replacement: path.resolve("./node_modules/buffer") }
      ]
    }),    
    json()
  ],
  external: ["http-request", "create-response", "log"]
};