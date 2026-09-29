import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDistance, straightDistance } from '../display/display-data.ts';

test('straight-line distance uses metres for nearby facilities and kilometres for farther ones', () => {
  assert.equal(straightDistance([120, 29], [120, 29]), 0);
  const oneLatitudeDegree = straightDistance([120, 29], [120, 30]);
  assert.ok(oneLatitudeDegree >= 111000 && oneLatitudeDegree <= 112000);
  assert.equal(formatDistance(600), '600 米');
  assert.equal(formatDistance(3700), '3.7 公里');
});
