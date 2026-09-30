import { existsSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main } from './main';

const fx = (p: string) => fileURLToPath(new URL(`../fixtures/${p}`, import.meta.url));

function capture() {
  const lines: string[] = [];
  return { io: { log: (s: string) => lines.push(s) }, lines };
}

describe('main', () => {
  it('validate passes the good fixtures', async () => {
    const { io, lines } = capture();
    expect(await main(['validate', '--root', fx('good')], io)).toBe(0);
    expect(lines).toContain('✓ hello');
  });

  it('validate fails with every issue listed', async () => {
    const { io, lines } = capture();
    expect(await main(['validate', '--root', fx('bad-schema')], io)).toBe(1);
    expect(lines.some((l) => l.startsWith('✗ wrong: problem.yaml /slug'))).toBe(true);
  });

  it('test runs every stage', async () => {
    const { io, lines } = capture();
    expect(await main(['test', 'hello', '--root', fx('good')], io)).toBe(0);
    expect(lines).toContain('  ✓ javascript greet solution');
    expect(lines).toContain('  ✓ javascript shout starter');
  });

  it('test fails on weak tests', async () => {
    const { io } = capture();
    expect(await main(['test', '--root', fx('weak')], io)).toBe(1);
  });

  it('build writes the output', async () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'cli-'));
    const { io } = capture();
    expect(await main(['build', '--root', fx('good'), '--out', out], io)).toBe(0);
    expect(existsSync(path.join(out, 'index.json'))).toBe(true);
  });

  it('build refuses when validation fails', async () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'cli-'));
    const { io } = capture();
    expect(await main(['build', '--root', fx('bad-schema'), '--out', out], io)).toBe(1);
    expect(existsSync(path.join(out, 'index.json'))).toBe(false);
  });

  it('unknown slug is an error', async () => {
    const { io, lines } = capture();
    expect(await main(['validate', 'nope', '--root', fx('good')], io)).toBe(1);
    expect(lines).toContain('✗ nope: no such problem folder');
  });

  it('prints usage for an unknown command', async () => {
    const { io, lines } = capture();
    expect(await main(['frobnicate'], io)).toBe(2);
    expect(lines[0]).toMatch(/^usage: /);
  });
});
