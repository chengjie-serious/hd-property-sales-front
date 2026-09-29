import assert from 'node:assert/strict';
import test from 'node:test';
import { api } from '../api.ts';

test('deleting a region sends no JSON content type when the request has no body', async () => {
  const originalFetch = globalThis.fetch;
  let headers: Headers | undefined;
  globalThis.fetch = async (_input, init) => {
    headers = new Headers(init?.headers);
    return new Response(null, { status: 204 });
  };
  try {
    await api.deleteRegion('region-id');
    assert.equal(headers?.get('content-type'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
