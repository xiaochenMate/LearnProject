import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const code = fs.readFileSync('./lib/chessEngine.ts', 'utf-8');
const ts = require('typescript');
const jsCode = ts.transpile(code, { target: ts.ScriptTarget.ES2020 });
fs.writeFileSync('./lib/chessEngine.mjs', jsCode);
