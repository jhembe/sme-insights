#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Patch 1: vite-plugin-pwa ESM chunk needs createRequire to use require()
const chunkPath = path.join(__dirname, '..', 'node_modules', 'vite-plugin-pwa', 'dist', 'chunk-UB6OAFZF.js');

if (!fs.existsSync(chunkPath)) {
  console.log('vite-plugin-pwa chunk not found, skipping patch 1');
} else {
  const content = fs.readFileSync(chunkPath, 'utf8');
  const MARKER = '/* cjs-require-patched */';
  if (content.includes(MARKER)) {
    console.log('vite-plugin-pwa already patched (patch 1)');
  } else {
    const prefix = `${MARKER}\nimport { createRequire as __nodeCreateRequire } from 'module';\nconst require = __nodeCreateRequire(import.meta.url);\n`;
    fs.writeFileSync(chunkPath, prefix + content);
    console.log('vite-plugin-pwa patched for Node 18 ESM compatibility (patch 1)');
  }
}

// Patch 2: serialize-javascript uses bare `crypto` which is undefined in Worker threads on Node 18
const serializePath = path.join(__dirname, '..', 'node_modules', 'serialize-javascript', 'index.js');

if (!fs.existsSync(serializePath)) {
  console.log('serialize-javascript not found, skipping patch 2');
} else {
  const content = fs.readFileSync(serializePath, 'utf8');
  const MARKER2 = '/* crypto-worker-patched */';
  if (content.includes(MARKER2)) {
    console.log('serialize-javascript already patched (patch 2)');
  } else {
    // Inject polyfill after 'use strict'; — Worker threads in Node 18 don't expose globalThis.crypto
    const polyfill = `${MARKER2}\nif (typeof crypto === 'undefined') { var crypto = require('crypto').webcrypto; }\n`;
    const patched = content.replace("'use strict';", `'use strict';\n${polyfill}`);
    fs.writeFileSync(serializePath, patched);
    console.log('serialize-javascript patched for Node 18 Worker thread crypto (patch 2)');
  }
}
