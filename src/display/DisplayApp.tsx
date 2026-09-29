import { Alert, Button, Empty, Input, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Amenity, type Community, type CommunitySummary, type Position, type Region } from '../api';
import { MapView } from '../MapView';
import { DisplayDetails, type DisplaySelection } from './DisplayDetails';
import './display.less';

type SearchResult = DisplaySelection & { name: string; subtitle: string };

export function DisplayApp() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [boundary, setBoundary] = useState<Position[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, CommunitySummary>>({});
  const [selection, setSelection] = useState<DisplaySelection | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([api.regions(), api.allCommunities(), api.allAmenities(), api.overviewBoundary()])
      .then(async ([nextRegions, nextCommunities, nextAmenities, nextBoundary]) => {
        if (!active) return;
        setRegions(nextRegions); setCommunities(nextCommunities); setAmenities(nextAmenities);
        setBoundary(nextBoundary.polygon); setLoading(false);
        const results = await Promise.allSettled(nextCommunities.map((item) => api.summary(item.id)));
        if (active) setSummaries(Object.fromEntries(results.flatMap((result, index) =>
          result.status === 'fulfilled' ? [[nextCommunities[index]!.id, result.value] as const] : [])));
      })
      .catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : '展示数据加载失败'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const choose = useCallback((next: DisplaySelection) => {
    setSelection(next); setSearchOpen(false); setQuery('');
  }, []);
  const searchResults = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...regions.filter((item) => item.name.toLocaleLowerCase().includes(term))
        .map((item) => ({ kind: 'region' as const, id: item.id, name: item.name, subtitle: '片区' })),
      ...communities.filter((item) => item.name.toLocaleLowerCase().includes(term))
        .map((item) => ({ kind: 'community' as const, id: item.id, name: item.name,
          subtitle: `小区 · ${regions.find((region) => region.id === item.regionId)?.name ?? '未归属片区'}` })),
      ...amenities.filter((item) => item.name.toLocaleLowerCase().includes(term))
        .map((item) => ({ kind: 'amenity' as const, id: item.id, name: item.name, subtitle: `周边设施 · ${item.typeLabel}` })),
    ];
  }, [query, regions, communities, amenities]);

  const selectedRegion = selection?.kind === 'region' ? regions.find((item) => item.id === selection.id) : undefined;
  const selectedCommunity = selection?.kind === 'community' ? communities.find((item) => item.id === selection.id) : undefined;
  const selectedAmenity = selection?.kind === 'amenity' ? amenities.find((item) => item.id === selection.id) : undefined;
  const activeSelection = selectedRegion || selectedCommunity || selectedAmenity ? selection : null;
  const focusPosition: Position | null = selectedCommunity ? [selectedCommunity.longitude, selectedCommunity.latitude]
    : selectedAmenity ? [selectedAmenity.longitude, selectedAmenity.latitude] : null;

  return <div className={classNames('display-shell', { 'display-shell-detail-open': activeSelection })}>
    <main className="display-map-column">
      <div className="display-search-bar">
        <div className="display-brand"><span className="display-brand-mark">横</span><div><strong>横店楼盘地图</strong><small>片区 · 小区 · 周边设施</small></div></div>
        <div className="display-search-area">
          <Input.Search aria-label="搜索片区、小区或周边设施" value={query} allowClear enterButton="搜索"
            placeholder="搜索片区、小区或周边设施" onFocus={() => setSearchOpen(Boolean(query.trim()))}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); }}
            onSearch={(value) => setSearchOpen(Boolean(value.trim()))}
            onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }} />
          {searchOpen && <div className="display-search-results" role="listbox" aria-label="搜索结果">
            {searchResults.length ? searchResults.map((item) => <button type="button" role="option" aria-selected={false}
              className="display-search-result" key={`${item.kind}:${item.id}`} onClick={() => choose(item)}>
              <span>{item.name}</span><small>{item.subtitle}</small>
            </button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的片区、小区或设施" />}
          </div>}
        </div>
        {activeSelection && <Button onClick={() => setSelection(null)}>返回总览</Button>}
      </div>
      {error && <Alert className="display-error" type="error" showIcon message={error} />}
      <div className="display-map-area">
        {loading ? <div className="display-loading"><Spin size="large" /><span>地图数据加载中</span></div>
          : <MapView regions={regions} communities={communities} amenities={amenities} summaries={summaries}
            selectedRegionId={selectedRegion?.id ?? null} onRegionSelect={(id) => choose({ kind: 'region', id })}
            onCommunitySelect={(item) => choose({ kind: 'community', id: item.id })}
            onAmenitySelect={(item) => choose({ kind: 'amenity', id: item.id })}
            overviewBoundary={boundary} focusPosition={focusPosition} />}
      </div>
    </main>
    {activeSelection && <aside className="display-detail-column" aria-label="所选地点详情">
      <DisplayDetails selection={activeSelection} regions={regions} communities={communities} amenities={amenities}
        summaries={summaries} onClose={() => setSelection(null)} onSelect={choose} />
    </aside>}
  </div>;
}
