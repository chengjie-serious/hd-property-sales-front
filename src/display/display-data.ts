import type { Amenity, Community, CommunitySummary, Position } from '../api';

export function straightDistance(origin: Position, destination: Position): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (destination[1] - origin[1]) * radians;
  const longitudeDelta = (destination[0] - origin[0]) * radians;
  const firstLatitude = origin[1] * radians;
  const secondLatitude = destination[1] * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} 米` : `${(meters / 1000).toFixed(1)} 公里`;
}

export function communitySalePrice(community: Community, summaries: Record<string, CommunitySummary>): number | null {
  return summaries[community.id]?.saleAveragePerSquareMeter ?? community.referenceSalePrice;
}

export function sortedAssociatedCommunities(amenity: Amenity, communities: Community[]): Community[] {
  return communities.filter((item) => amenity.communityIds.includes(item.id))
    .sort((a, b) => Number(b.isHot) - Number(a.isHot) || a.name.localeCompare(b.name, 'zh-CN'));
}
