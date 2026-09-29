import assert from 'node:assert/strict';
import test from 'node:test';
import { getAncestorPath } from './tree-ancestor-path.ts';

test('returns all ancestors from region to floor', () => {
  const parents = { region: null, community: 'region', building: 'community', unit: 'building', floor: 'unit', room: 'floor' };
  assert.deepEqual(getAncestorPath('room', parents), ['region', 'community', 'building', 'unit', 'floor']);
});
test('stops when a parent was removed', () => {
  assert.deepEqual(getAncestorPath('room', { room: 'floor', floor: 'unit' }), ['floor']);
});
