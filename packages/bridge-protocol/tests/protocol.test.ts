/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EVENTS,
  METHODS,
  PROTOCOL_VERSION,
  errorMessage,
  eventMessage,
  parseCall,
  resultMessage,
} from '../src/index';

const dart = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../flutter/lib/src/bridge/protocol.dart'),
  'utf8',
);
const dartList = (name: string): string[] => {
  const match = new RegExp(`const List<String> ${name} = \\[([^\\]]*)\\]`).exec(dart);
  if (!match?.[1]) throw new Error(`${name} not found in protocol.dart`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
};

describe('bridge protocol', () => {
  it('has the same methods, events and version in TypeScript and Dart', () => {
    expect(dartList('bridgeMethods')).toEqual([...METHODS]);
    expect(dartList('bridgeEvents')).toEqual([...EVENTS]);
    expect(dart).toContain(`const int protocolVersion = ${PROTOCOL_VERSION};`);
  });

  it('accepts well-formed calls to allowed methods', () => {
    const call = parseCall(
      JSON.stringify({
        v: 1,
        kind: 'call',
        id: 7,
        method: 'execute',
        params: { command: 'toggleBold' },
      }),
    );
    expect(call).toEqual({
      v: 1,
      kind: 'call',
      id: 7,
      method: 'execute',
      params: { command: 'toggleBold' },
    });
  });

  it('rejects anything else instead of running it', () => {
    const bad = [
      'not json',
      '[]',
      JSON.stringify({ v: 2, kind: 'call', id: 1, method: 'getJson' }),
      JSON.stringify({ v: 1, kind: 'event', id: 1, method: 'getJson' }),
      JSON.stringify({ v: 1, kind: 'call', id: -1, method: 'getJson' }),
      JSON.stringify({ v: 1, kind: 'call', id: 1.5, method: 'getJson' }),
      JSON.stringify({ v: 1, kind: 'call', id: 1, method: 'eval' }),
      JSON.stringify({ v: 1, kind: 'call', id: 1, method: '__proto__' }),
      JSON.stringify({ v: 1, kind: 'call', id: 1, method: 'getJson', params: [1] }),
    ];
    for (const raw of bad) expect(parseCall(raw), raw).toBeNull();
  });

  it('builds results and events', () => {
    expect(resultMessage(3, 'x')).toEqual({ v: 1, kind: 'result', id: 3, ok: true, value: 'x' });
    expect(errorMessage(3, 'no')).toEqual({ v: 1, kind: 'result', id: 3, ok: false, error: 'no' });
    expect(eventMessage('ready')).toEqual({ v: 1, kind: 'event', name: 'ready' });
  });
});
