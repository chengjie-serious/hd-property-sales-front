import { Button, Empty, Image, Modal, Spin, Tabs, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api, type Amenity, type Community, type CommunitySummary, type Listing, type Region } from '../api';
import { MortgageCalculator } from '../MortgageCalculator';
import { communitySalePrice, formatDistance, sortedAssociatedCommunities, straightDistance } from './display-data';

export type DisplaySelection = { kind: 'region' | 'community' | 'amenity'; id: string };
type Props = {
  selection: DisplaySelection;
  regions: Region[];
  communities: Community[];
  amenities: Amenity[];
  summaries: Record<string, CommunitySummary>;
  onClose: () => void;
  onSelect: (selection: DisplaySelection) => void;
};

function Media({ id, alt, className }: { id: string | null; alt: string; className?: string }) {
  return id ? <img className={className} src={`/api/media/${id}`} alt={alt} />
    : <div className={`${className ?? ''} display-media-placeholder`} role="img" aria-label="暂无图片">暂无图片</div>;
}

function CommunityCard({ community, summaries, onClick }: {
  community: Community; summaries: Record<string, CommunitySummary>; onClick: () => void;
}) {
  const price = communitySalePrice(community, summaries);
  return <button type="button" className="display-community-card" onClick={onClick}>
    <Media id={community.mainMediaId} alt={`${community.name}主图`} className="display-community-card-image" />
    <span className="display-community-card-body"><strong>{community.name}</strong>
      <span>{price == null ? '均价待录入' : `均价 ${price.toLocaleString('zh-CN')} 元/㎡`}</span>
      {community.isHot && <em>热门小区</em>}
    </span>
  </button>;
}

function ListingCard({ listing, onClick }: { listing: Listing; onClick: () => void }) {
  return <button type="button" className="display-listing-card" onClick={onClick}>
    <Media id={listing.mainMediaId} alt="房屋主图" className="display-listing-card-image" />
    <span className="display-listing-card-body"><strong>{listing.buildingNumber}幢 {listing.unitNumber}单元 {listing.roomNumber}室</strong>
      <span>{listing.bedrooms}室 {listing.livingRooms}厅 {listing.bathrooms}卫 · {listing.area}㎡</span>
      <b>{listing.type === 'sale' ? `${listing.price} 万元` : `${listing.price} 元/月`}</b>
    </span>
  </button>;
}

export function DisplayDetails({ selection, regions, communities, amenities, summaries, onClose, onSelect }: Props) {
  const region = selection.kind === 'region' ? regions.find((item) => item.id === selection.id) : undefined;
  const community = selection.kind === 'community' ? communities.find((item) => item.id === selection.id) : undefined;
  const amenity = selection.kind === 'amenity' ? amenities.find((item) => item.id === selection.id) : undefined;
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setListings([]); setListingsError(''); setSelectedListing(null); setListingType('sale'); setCalculatorOpen(false);
    if (!community) return () => { active = false; };
    setListingsLoading(true);
    void api.listings(community.id).then((rows) => { if (active) setListings(rows); })
      .catch((cause) => { if (active) setListingsError(cause instanceof Error ? cause.message : '房源加载失败'); })
      .finally(() => { if (active) setListingsLoading(false); });
    return () => { active = false; };
  }, [community?.id]);

  const regionCommunities = useMemo(() => region
    ? communities.filter((item) => item.regionId === region.id) : [], [region, communities]);
  const regionAmenities = region ? amenities.filter((item) => item.communityIds.some((id) => regionCommunities.some((c) => c.id === id))) : [];
  const hotCommunities = regionCommunities.filter((item) => item.isHot)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  const saleCount = regionCommunities.reduce((sum, item) => sum + (summaries[item.id]?.saleCount ?? 0), 0);
  const rentCount = regionCommunities.reduce((sum, item) => sum + (summaries[item.id]?.rentCount ?? 0), 0);
  const regionPrice = saleCount ? Math.round(regionCommunities.reduce((sum, item) =>
    sum + (summaries[item.id]?.saleAveragePerSquareMeter ?? 0) * (summaries[item.id]?.saleCount ?? 0), 0) / saleCount) : null;
  const communityAmenities = community ? amenities.filter((item) => item.communityIds.includes(community.id))
    .sort((a, b) => straightDistance([community.longitude, community.latitude], [a.longitude, a.latitude])
      - straightDistance([community.longitude, community.latitude], [b.longitude, b.latitude])) : [];
  const associatedCommunities = amenity ? sortedAssociatedCommunities(amenity, communities) : [];
  const visibleListings = listings.filter((item) => item.type === listingType);
  const title = region?.name ?? community?.name ?? amenity?.name ?? '地点详情';

  return <div className="display-detail-inner">
    <div className="display-detail-heading"><div><span className="display-detail-kicker">{region ? '片区信息' : community ? '小区信息' : '周边设施'}</span>
      <h2>{title}</h2></div><Button aria-label="关闭详情" onClick={onClose}>关闭</Button></div>

    {region && <>
      <div className="display-region-intro"><span className="display-region-color" style={{ background: region.color }} />
        <span>横店片区 · 已收录 {regionCommunities.length} 个小区</span></div>
      <div className="display-stat-grid">
        <div><strong>{saleCount}</strong><span>在售房屋</span></div><div><strong>{rentCount}</strong><span>待租房屋</span></div>
        <div><strong>{regionPrice == null ? '—' : regionPrice.toLocaleString('zh-CN')}</strong><span>参考在售均价 元/㎡</span></div>
        <div><strong>{regionAmenities.length}</strong><span>关联设施</span></div>
      </div>
      <section className="display-detail-section display-section-bottom"><h3>热门小区</h3>
        {hotCommunities.length ? <div className="display-card-list">{hotCommunities.map((item) =>
          <CommunityCard key={item.id} community={item} summaries={summaries}
            onClick={() => onSelect({ kind: 'community', id: item.id })} />)}</div>
          : <Empty description="该片区暂无热门小区" />}
      </section>
    </>}

    {community && <>
      <Media id={community.mainMediaId} alt={`${community.name}主图`} className="display-detail-hero" />
      <div className="display-community-meta"><span>{community.address}</span>
        <span>交付日期：{community.deliveryDate || '暂无'}</span>
        {community.regionId && <button type="button" onClick={() => onSelect({ kind: 'region', id: community.regionId! })}>
          所属片区：{regions.find((item) => item.id === community.regionId)?.name ?? '未命名片区'} →</button>}</div>
      <div className="display-stat-grid">
        <div><strong>{communitySalePrice(community, summaries)?.toLocaleString('zh-CN') ?? '—'}</strong><span>在售均价 元/㎡</span></div>
        <div><strong>{community.buildingCount}</strong><span>规划楼幢</span></div>
        <div><strong>{summaries[community.id]?.saleCount ?? 0}</strong><span>在售房屋</span></div>
        <div><strong>{summaries[community.id]?.rentCount ?? 0}</strong><span>待租房屋</span></div>
      </div>
      <section className="display-detail-section"><h3>小区简介</h3><p>{community.description || '暂无简介'}</p>
        {community.summary && <p className="display-muted">配套摘要：{community.summary}</p>}
        {!!community.detailMediaIds.length && <div className="display-community-photos"><Image.PreviewGroup>
          {community.detailMediaIds.map((id) => <Image key={id} src={`/api/media/${id}`} alt="小区详情图" />)}
        </Image.PreviewGroup></div>}
      </section>
      <section className="display-detail-section"><h3>关联周边设施</h3>
        {communityAmenities.length ? <div className="display-amenity-list">{communityAmenities.map((item) =>
          <button type="button" key={item.id} onClick={() => onSelect({ kind: 'amenity', id: item.id })}>
            <span className="display-amenity-dot" style={{ background: item.color }}>{item.typeLabel.charAt(0)}</span>
            <span><small>{item.typeLabel}</small><strong>{item.name}</strong></span>
            <em>直线 {formatDistance(straightDistance([community.longitude, community.latitude], [item.longitude, item.latitude]))}</em>
          </button>)}</div> : <Empty description="暂无关联设施" />}
      </section>
      <section className="display-detail-section display-section-bottom"><h3>房屋信息</h3>
        <Tabs activeKey={listingType} onChange={(key) => setListingType(key as 'sale' | 'rent')}
          items={[{ key: 'sale', label: `在售 ${listings.filter((item) => item.type === 'sale').length}` },
            { key: 'rent', label: `待租 ${listings.filter((item) => item.type === 'rent').length}` }]} />
        {listingsLoading ? <div className="display-inline-loading"><Spin /></div>
          : listingsError ? <Typography.Text type="danger">{listingsError}</Typography.Text>
            : visibleListings.length ? <div className="display-card-list">{visibleListings.map((item) =>
              <ListingCard key={item.id} listing={item} onClick={() => setSelectedListing(item)} />)}</div>
              : <Empty description={`暂无${listingType === 'sale' ? '在售' : '待租'}房屋`} />}
      </section>
    </>}

    {amenity && <>
      <div className="display-facility-title"><span className="display-amenity-dot" style={{ background: amenity.color }}>{amenity.typeLabel.charAt(0)}</span>
        <div><Tag color={amenity.color}>{amenity.typeLabel}</Tag><h3>{amenity.name}</h3></div></div>
      <div className="display-community-meta"><span>{amenity.address}</span>{amenity.note && <span>{amenity.note}</span>}</div>
      <section className="display-detail-section display-section-bottom"><h3>关联小区</h3>
        {associatedCommunities.length ? <div className="display-card-list">{associatedCommunities.map((item) =>
          <CommunityCard key={item.id} community={item} summaries={summaries}
            onClick={() => onSelect({ kind: 'community', id: item.id })} />)}</div>
          : <Empty description="暂无关联小区" />}
      </section>
    </>}

    <Modal title={selectedListing ? `${selectedListing.buildingNumber}幢 ${selectedListing.unitNumber}单元 ${selectedListing.roomNumber}室` : '房屋详情'}
      open={Boolean(selectedListing)} onCancel={() => { setSelectedListing(null); setCalculatorOpen(false); }} footer={null} width={760} destroyOnHidden>
      {selectedListing && <div className="display-listing-detail">
        <strong className="display-listing-price">{selectedListing.type === 'sale' ? `${selectedListing.price} 万元` : `${selectedListing.price} 元/月`}</strong>
        <div className="display-listing-facts"><span>{selectedListing.area} ㎡</span>
          <span>{selectedListing.bedrooms} 室 {selectedListing.livingRooms} 厅 {selectedListing.bathrooms} 卫</span>
          <span>第 {selectedListing.floor} 层 / 共 {selectedListing.totalFloors} 层</span>
          <span>{selectedListing.decoration}</span>
          {community && <span>房龄约 {Math.max(0, new Date().getFullYear() - Number(community.deliveryDate.slice(0, 4)))} 年</span>}
        </div>
        <div className="display-listing-photos"><Image.PreviewGroup>
          {selectedListing.mainMediaId && <Image src={`/api/media/${selectedListing.mainMediaId}`} alt="房屋主图" />}
          {selectedListing.floorplanMediaId && <Image src={`/api/media/${selectedListing.floorplanMediaId}`} alt="户型图" />}
          {selectedListing.detailMediaIds.map((id, index) => <Image key={id} src={`/api/media/${id}`} alt={`房屋详情图 ${index + 1}`} />)}
        </Image.PreviewGroup></div>
        {selectedListing.type === 'sale' && <Button onClick={() => setCalculatorOpen(true)}>房贷计算器</Button>}
        {selectedListing.type === 'sale' && <MortgageCalculator key={selectedListing.id} open={calculatorOpen}
          onClose={() => setCalculatorOpen(false)} salePriceWan={selectedListing.price} />}
      </div>}
    </Modal>
  </div>;
}
