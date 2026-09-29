import assert from 'node:assert/strict';
import test from 'node:test';
import { amenityMarkerText } from './amenity-marker.ts';

test('facility markers use the category first character instead of the facility name', () => {
  assert.equal(amenityMarkerText('医院', 'hospital'), '医');
  assert.equal(amenityMarkerText('公交站', 'bus_stop'), '公');
});
