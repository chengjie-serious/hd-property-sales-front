import assert from 'node:assert/strict';
import test from 'node:test';
import { regionLabelPosition } from './region-label-position.ts';

test('region label sits in the middle of a rectangular region', () => {
  assert.deepEqual(regionLabelPosition([[0, 0], [4, 0], [4, 2], [0, 2]]), [2, 1]);
});

test('region label chooses an interior slice for a concave region', () => {
  assert.deepEqual(regionLabelPosition([[0, 0], [6, 0], [6, 4], [4, 4], [4, 1], [2, 1], [2, 4], [0, 4]]), [1, 2]);
});
