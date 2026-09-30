import { describe, expect, it } from 'vitest';
import { BLOCKED_GLOBALS, lockdown } from './lockdown';

function fakeScope() {
  class ScopeProto {
    fetch() {
      return 'network';
    }
    postMessage() {
      return 'ok';
    }
  }
  const scope = Object.create(ScopeProto.prototype) as Record<string, unknown>;
  scope.XMLHttpRequest = class {};
  scope.WebSocket = class {};
  return scope;
}

describe('lockdown', () => {
  it('hides blocked globals on the scope and its prototype chain', () => {
    const scope = fakeScope();
    lockdown(scope);
    expect(scope.fetch).toBeUndefined();
    expect((Object.getPrototypeOf(scope) as Record<string, unknown>).fetch).toBeUndefined();
    expect(scope.XMLHttpRequest).toBeUndefined();
    expect(scope.WebSocket).toBeUndefined();
  });

  it('cannot be undone by reassigning or redefining', () => {
    const scope = fakeScope();
    lockdown(scope);
    expect(() => {
      'use strict';
      scope.fetch = () => 'again';
    }).toThrow(TypeError);
    expect(() => Object.defineProperty(scope, 'fetch', { value: () => 'again' })).toThrow(TypeError);
  });

  it('leaves other globals alone', () => {
    const scope = fakeScope();
    lockdown(scope);
    expect((scope.postMessage as () => string)()).toBe('ok');
  });

  it('covers every name in the spec', () => {
    expect([...BLOCKED_GLOBALS].sort()).toEqual(
      ['BroadcastChannel', 'EventSource', 'FontFace', 'SharedWorker', 'WebSocket', 'WebSocketStream', 'WebTransport', 'Worker', 'XMLHttpRequest', 'caches', 'fetch', 'fonts', 'importScripts', 'indexedDB'].sort(),
    );
  });
});
