import type { Listing } from '../api';

export type ListingFilter = {
  type: 'sale' | 'rent'; query: string; regionIds: string[]; communityIds: string[];
  floors: number[]; status: 'all' | 'listed' | 'offline' | 'draft';
  goodPrice: boolean; urgentSale: boolean;
};
export function filterListings(listings: Listing[], filter: ListingFilter): Listing[] {
  const query = filter.query.trim().toLowerCase();
  return listings.filter((item) => item.type === filter.type &&
    (!query || (item.communityName ?? '').toLowerCase().includes(query)) &&
    (!filter.regionIds.length || (item.regionId != null && filter.regionIds.includes(item.regionId))) &&
    (!filter.communityIds.length || (item.communityId != null && filter.communityIds.includes(item.communityId))) &&
    (!filter.floors.length || filter.floors.includes(item.floor)) &&
    (filter.status === 'all' || item.status === filter.status) &&
    (!filter.goodPrice || item.isGoodPrice) &&
    (!filter.urgentSale || (item.type === 'sale' && item.isUrgentSale)));
}
