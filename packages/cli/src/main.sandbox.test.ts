// Own file: lockdown(globalThis) can't be undone, so it must not leak into other test files.
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main } from './main';

describe('test command sandbox', () => {
  it('runs contributed code without network globals, like the browser worker', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
    cpSync(fileURLToPath(new URL('../fixtures/good/hello', import.meta.url)), path.join(root, 'hello'), { recursive: true });
    // Reaches fetch without the literal "fetch(" the static check looks for.
    writeFileSync(
      path.join(root, 'hello/javascript/stages/1-greet/solution/greet.js'),
      "export function greet(name) {\n  if (typeof globalThis['fe' + 'tch'] === 'function') throw new Error('network is reachable');\n  return `Hello, ${name}!`;\n}\n",
    );
    const lines: string[] = [];
    expect(await main(['test', '--root', root], { log: (s) => lines.push(s) })).toBe(0);
    expect(lines).toContain('  ✓ javascript greet solution');
  });
});
