export type Position = [longitude: number, latitude: number];
export type Region = {
  id: string; name: string; color: string; polygon: Position[];
  status: string; sortOrder: number;
};
export type Community = {
  id: string; regionId: string | null; name: string; address: string;
  longitude: number; latitude: number; deliveryDate: string;
  summary: string; visible: boolean; isHot: boolean;
  buildingCount: number; referenceSalePrice: number | null;
};
export type Amenity = {
  id: string; communityIds: string[]; type: string; typeLabel: string; color: string; name: string; address: string;
  longitude: number; latitude: number; note: string;
};
export type AmenityType = { code: string; label: string; color: string; sortOrder: number };
export type RouteSummary = { mode: 'walking' | 'driving'; distanceMeters: number; durationSeconds: number };
export type Place = { id: string; name: string; address: string; longitude: number; latitude: number };
export type Room = { id: string; unitId: string; floor: number; number: string };
export type Unit = { id: string; buildingId: string; number: string; rooms: Room[] };
export type Building = { id: string; communityId: string; number: string; totalFloors: number; defaultRoomId: string | null; units: Unit[] };
export type Listing = {
  id: string; roomId: string; type: 'sale' | 'rent'; status: string;
  price: number; area: number; bedrooms: number; livingRooms: number; bathrooms: number; decoration: string;
  mainMediaId: string | null; floorplanMediaId: string | null; detailMediaIds: string[];
  buildingNumber: string; unitNumber: string; roomNumber: string; floor: number; totalFloors: number;
  defaultRoomId: string | null; updatedAt: string;
  isGoodPrice: boolean; isUrgentSale: boolean;
  communityId?: string; communityName?: string; regionId?: string | null;
};
export type CommunitySummary = {
  saleCount: number; rentCount: number;
  saleAveragePerSquareMeter: number | null; rentAverageMonthly: number | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options?.body != null ? { 'content-type': 'application/json' } : {}), ...options?.headers },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(result.error ?? `请求失败：${response.status}`);
  return result as T;
}

export const api = {
  regions: () => request<Region[]>('/api/regions'),
  allCommunities: () => request<Community[]>('/api/communities'),
  adminCommunities: () => request<Community[]>('/api/admin/communities'),
  overviewBoundary: () => request<{ polygon: Position[] | null }>('/api/map/overview-boundary'),
  amenityTypes: () => request<AmenityType[]>('/api/amenity-types'),
  addAmenityType: (input: Pick<AmenityType, 'code' | 'label' | 'color'>) => request<AmenityType>('/api/admin/amenity-types', { method: 'POST', body: JSON.stringify(input) }),
  updateAmenityType: (code: string, input: Pick<AmenityType, 'label' | 'color'>) => request<AmenityType>(`/api/admin/amenity-types/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteAmenityType: (code: string) => request<void>(`/api/admin/amenity-types/${encodeURIComponent(code)}`, { method: 'DELETE' }),
  communities: (regionId: string) => request<Community[]>(`/api/regions/${encodeURIComponent(regionId)}/communities`),
  addRegion: (input: Pick<Region, 'name' | 'color' | 'polygon'>) =>
    request<Region>('/api/admin/regions', { method: 'POST', body: JSON.stringify(input) }),
  updateRegion: (id: string, input: Pick<Region, 'name' | 'color' | 'polygon'>) =>
    request<Region>(`/api/admin/regions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteRegion: (id: string) => request<void>(`/api/admin/regions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addCommunity: (input: Pick<Community, 'regionId' | 'name' | 'address' | 'longitude' | 'latitude' | 'deliveryDate'> & { summary?: string; buildingCount?: number; referenceSalePrice?: number | null }) =>
    request<Community>('/api/admin/communities', { method: 'POST', body: JSON.stringify(input) }),
  updateCommunity: (id: string, input: Pick<Community, 'regionId' | 'name' | 'address' | 'longitude' | 'latitude' | 'deliveryDate' | 'summary' | 'buildingCount' | 'referenceSalePrice' | 'isHot' | 'visible'> & { amenityIds: string[] }) =>
    request<Community>(`/api/admin/communities/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  updateCommunityPropertyInfo: (id: string, input: Pick<Community, 'buildingCount' | 'referenceSalePrice'>) =>
    request<Community>(`/api/admin/communities/${encodeURIComponent(id)}/property-info`, { method: 'PUT', body: JSON.stringify(input) }),
  assignCommunities: (communityIds: string[], regionId: string | null) =>
    request<{ updated: number }>('/api/admin/communities/bulk-region', { method: 'PUT', body: JSON.stringify({ communityIds, regionId }) }),
  deleteCommunities: (communityIds: string[]) =>
    request<{ deleted: number }>('/api/admin/communities/bulk-delete', { method: 'POST', body: JSON.stringify({ communityIds }) }),
  deleteCommunity: (id: string) => request<void>(`/api/admin/communities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setCommunityHot: (id: string, isHot: boolean) => request<Community>(`/api/admin/communities/${encodeURIComponent(id)}/hot`, { method: 'PUT', body: JSON.stringify({ isHot }) }),
  allAmenities: () => request<Amenity[]>('/api/amenities'),
  amenities: (communityId: string) => request<Amenity[]>(`/api/communities/${encodeURIComponent(communityId)}/amenities`),
  addAmenity: (input: Pick<Amenity, 'communityIds' | 'type' | 'name' | 'address' | 'longitude' | 'latitude'> & { note?: string }) =>
    request<Amenity>('/api/admin/amenities', { method: 'POST', body: JSON.stringify(input) }),
  updateAmenity: (id: string, input: Pick<Amenity, 'communityIds' | 'type' | 'name' | 'address' | 'longitude' | 'latitude'> & { note?: string }) =>
    request<Amenity>(`/api/admin/amenities/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteAmenity: (id: string) => request<void>(`/api/admin/amenities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  places: (keywords: string, regionId?: string) => request<Place[]>(`/api/admin/places?${new URLSearchParams({ keywords, ...(regionId ? { regionId } : {}) })}`),
  route: (mode: 'walking' | 'driving', origin: Position, destination: Position) => {
    const params = new URLSearchParams({ mode, origin: origin.join(','), destination: destination.join(',') });
    return request<RouteSummary>(`/api/routes?${params}`);
  },
  structure: (communityId: string) => request<Building[]>(`/api/admin/communities/${encodeURIComponent(communityId)}/structure`),
  listings: (communityId: string, type?: 'sale' | 'rent') =>
    request<Listing[]>(`/api/communities/${encodeURIComponent(communityId)}/listings${type ? `?type=${type}` : ''}`),
  adminListings: (communityId: string) => request<Listing[]>(`/api/admin/communities/${encodeURIComponent(communityId)}/listings`),
  allAdminListings: () => request<Listing[]>('/api/admin/listings'),
  saveHome: async (input: {
    communityId: string; buildingNumber: string; unitNumber: string; totalFloors: number;
    floor: number; roomNumber: string; type: 'sale' | 'rent' | 'both'; salePrice?: number; rentPrice?: number;
    area: number; bedrooms: number; livingRooms: number; bathrooms: number; decoration: string;
    status: 'draft' | 'listed'; isDefault?: boolean; isGoodPrice?: boolean; isUrgentSale?: boolean;
  }, images: { main: File; floorplan?: File; details: File[] }) => {
    const body = new FormData();
    body.append('data', JSON.stringify(input));
    body.append('mainImage', images.main);
    if (images.floorplan) body.append('floorplanImage', images.floorplan);
    images.details.forEach((file) => body.append('detailImages', file));
    const response = await fetch('/api/admin/homes', { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `保存失败：${response.status}`);
    return result as { communityId: string; buildingId: string; unitId: string; roomId: string; listingIds: string[] };
  },
  summary: (communityId: string) => request<CommunitySummary>(`/api/communities/${encodeURIComponent(communityId)}/summary`),
  addBuilding: (input: { communityId: string; number: string; totalFloors: number }) =>
    request<Building>('/api/admin/buildings', { method: 'POST', body: JSON.stringify(input) }),
  addUnit: (input: { buildingId: string; number: string }) =>
    request<Unit>('/api/admin/units', { method: 'POST', body: JSON.stringify(input) }),
  addRoom: (input: { unitId: string; floor: number; number: string }) =>
    request<Room>('/api/admin/rooms', { method: 'POST', body: JSON.stringify(input) }),
  setDefaultRoom: (buildingId: string, roomId: string) =>
    request<Building>(`/api/admin/buildings/${encodeURIComponent(buildingId)}/default-room`, { method: 'PUT', body: JSON.stringify({ roomId }) }),
  addListing: (input: {
    roomId: string; type: 'sale' | 'rent'; status: 'draft' | 'listed';
    price: number; area: number; bedrooms: number; livingRooms: number; decoration: string;
    mainMediaId?: string; floorplanMediaId?: string; detailMediaIds: string[];
  }) => request<Listing>('/api/admin/listings', { method: 'POST', body: JSON.stringify(input) }),
  setListingStatus: (listingId: string, status: 'listed' | 'offline') =>
    request<Listing>(`/api/admin/listings/${encodeURIComponent(listingId)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateHome: async (listingId: string, input: {
    buildingNumber: string; unitNumber: string; totalFloors: number; floor: number; roomNumber: string;
    status: string; price: number; area: number; bedrooms: number; livingRooms: number; bathrooms: number;
    decoration: string; isGoodPrice: boolean; isUrgentSale: boolean; isDefault: boolean;
    mainMediaId: string | null; floorplanMediaId: string | null; detailMediaIds: string[];
  }, images: { main?: File; floorplan?: File; details?: File[] }) => {
    const body = new FormData();
    body.append('data', JSON.stringify(input));
    if (images.main) body.append('mainImage', images.main);
    if (images.floorplan) body.append('floorplanImage', images.floorplan);
    images.details?.forEach((file) => body.append('detailImages', file));
    const response = await fetch(`/api/admin/homes/${encodeURIComponent(listingId)}`, { method: 'PUT', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? '房屋保存失败');
    return result as { listingId: string; roomId: string };
  },
  uploadMedia: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/admin/media', { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? '图片上传失败');
    return result as { id: string; url: string };
  },
};
