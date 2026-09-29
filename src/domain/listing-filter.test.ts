import assert from 'node:assert/strict';
import test from 'node:test';
import { filterListings } from './listing-filter.ts';
import type { Listing } from '../api';

const listing = (overrides: Partial<Listing>): Listing => ({
  id: '1', roomId: 'r', type: 'sale', status: 'listed', price: 100, area: 80, bedrooms: 2,
  livingRooms: 1, bathrooms: 1, decoration: '精装', mainMediaId: 'm', floorplanMediaId: null,
  detailMediaIds: [], buildingNumber: '1', unitNumber: '1', roomNumber: '101', floor: 1,
  totalFloors: 10, defaultRoomId: null, updatedAt: '', communityId: 'c', communityName: '玫瑰星城',
  regionId: 'region', isGoodPrice: true, isUrgentSale: true, ...overrides,
});
test('combines community, floor, status and promotional filters', () => {
  const rows = [listing({}), listing({ id: '2', floor: 2 }), listing({ id: '3', type: 'rent' })];
  const result = filterListings(rows, { type: 'sale', query: '玫瑰', regionIds: ['region'], communityIds: ['c'],
    floors: [1], status: 'listed', goodPrice: true, urgentSale: true });
  assert.deepEqual(result.map((item) => item.id), ['1']);
});
