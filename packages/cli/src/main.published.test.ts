// Own file: main.test.ts runs `test`, which locks fetch for the rest of that file.
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from './main';

const fx = (p: string) => fileURLToPath(new URL(`../fixtures/${p}`, import.meta.url));

function capture() {
  const lines: string[] = [];
  return { io: { log: (s: string) => lines.push(s) }, lines };
}

describe('main', () => {
  describe('--published', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('names the HTTP status when the index is not there yet', async () => {
      vi.stubGlobal('fetch', async () => new Response('denied', { status: 403 }));
      const { io, lines } = capture();
      expect(await main(['validate', '--root', fx('good'), '--published', 'https://x.test/index.json'], io)).toBe(0);
      expect(lines).toContain('note: https://x.test/index.json returned HTTP 403 (not published yet?); skipped the slug check');
    });

    it('checks slugs against a published index', async () => {
      vi.stubGlobal('fetch', async () => Response.json({ generatedAt: '', problems: [{ slug: 'hello' }, { slug: 'gone' }] }));
      const { io, lines } = capture();
      expect(await main(['validate', '--root', fx('good'), '--published', 'https://x.test/index.json'], io)).toBe(1);
      expect(lines).toContain('✗ gone: published problem "gone" was removed or renamed; slugs are permanent');
    });
  });
});
