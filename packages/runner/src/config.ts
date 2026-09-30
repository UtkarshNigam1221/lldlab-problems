/** Pyodide version; must match the pyodide devDependency (checked by config.test.ts). */
export const PYODIDE_VERSION = '0.29.5';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`;
/** Built from packages/yaegi-runtime; must match its npm/package.json version. */
export const YAEGI_BASE_URL = 'https://cdn.jsdelivr.net/npm/lldlab-yaegi-runtime@0.2.0/';
export const YAEGI_WASM_URL = `${YAEGI_BASE_URL}yaegi.wasm`;
export const WASM_EXEC_URL = `${YAEGI_BASE_URL}wasm_exec.js`;
