import AMapLoader from '@amap/amap-jsapi-loader';
import { Button, Empty, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Amenity, Community, CommunitySummary, Position, Region } from './api';
import { MAP_CONFIG, mapKeyConfigured } from './config/map';
import { amenityMarkerText } from './domain/amenity-marker';
import { regionLabelPosition } from './domain/region-label-position';

declare global {
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string };
  }
}

type Props = {
  regions: Region[];
  communities: Community[];
  amenities: Amenity[];
  summaries: Record<string, CommunitySummary>;
  selectedRegionId: string | null;
  onRegionSelect: (id: string) => void;
  onCommunitySelect: (community: Community) => void;
  onPolygonDraw?: (polygon: Position[]) => void;
  onAmenitySelect?: (amenity: Amenity) => void;
  onMapClick?: (position: Position) => void;
  focusPosition?: Position | null;
  overviewBoundary?: Position[] | null;
  draftPolygon?: Position[] | null;
  extraZoomOutLevels?: number;
  manualBoundaryMode?: boolean;
  drawLabel?: string;
};

export function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const amap = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const townBoundary = useRef<any>(null);
  const boundaryZoomKey = useRef<string | null>(null);
  const mouseTool = useRef<any>(null);
  const onPolygonDraw = useRef(props.onPolygonDraw);
  onPolygonDraw.current = props.onPolygonDraw;
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(mapKeyConfigured);
  const [error, setError] = useState('');
  const stopDrawing = useCallback(() => {
    mouseTool.current?.close(true);
    mouseTool.current = null;
    setDrawing(false);
  }, []);
  const drawingEnabled = Boolean(props.onPolygonDraw);

  useEffect(() => {
    if (!drawingEnabled) stopDrawing();
    return () => { if (drawingEnabled) stopDrawing(); };
  }, [drawingEnabled, stopDrawing]);
  useEffect(() => {
    if (!drawing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); stopDrawing(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawing, stopDrawing]);

  useEffect(() => {
    if (!mapKeyConfigured || !container.current) return;
    let cancelled = false;
    window._AMapSecurityConfig = { serviceHost: `${window.location.origin}/_AMapService` };
    AMapLoader.load({ key: MAP_CONFIG.jsApiKey, version: MAP_CONFIG.version, plugins: ['AMap.MouseTool'] })
      .then((AMap) => {
        if (cancelled || !container.current) return;
        amap.current = AMap;
        map.current = new AMap.Map(container.current, {
          center: MAP_CONFIG.initialCenter,
          zoom: 13,
          zooms: [2, 20],
          viewMode: '3D',
          pitch: 0,
        });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError('地图加载失败，请检查 JS API Key、安全密钥及网络。'); setLoading(false); } });
    return () => { cancelled = true; mouseTool.current?.close(true); mouseTool.current = null;
      map.current?.destroy(); map.current = null; townBoundary.current = null; boundaryZoomKey.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !amap.current) return;
    if (townBoundary.current) map.current.remove(townBoundary.current);
    townBoundary.current = null;
    const extraZoomOutLevels = props.extraZoomOutLevels ?? 0;
    const zoomKey = JSON.stringify([props.overviewBoundary ?? null, extraZoomOutLevels]);
    const boundaryChanged = boundaryZoomKey.current !== zoomKey;
    boundaryZoomKey.current = zoomKey;
    if (!props.overviewBoundary?.length) {
      if (boundaryChanged) map.current.setZooms([Math.max(2, 13 - extraZoomOutLevels), 20]);
      return;
    }
    const boundary = new amap.current.Polygon({ path: props.overviewBoundary, strokeColor: '#227a76', strokeWeight: 3,
      fillColor: '#44a69a', fillOpacity: 0.07, zIndex: 1, bubble: true });
    townBoundary.current = boundary;
    map.current.add(boundary);
    if (boundaryChanged) map.current.setZooms([2, 20]);
    if (boundaryChanged || (!props.selectedRegionId && !props.focusPosition)) {
      map.current.setFitView([boundary], true, [40, 40, 40, 40]);
      if (boundaryChanged) map.current.setZooms([Math.max(2, map.current.getZoom() - extraZoomOutLevels), 20]);
    }
  }, [loading, props.overviewBoundary, props.extraZoomOutLevels, props.selectedRegionId, props.focusPosition]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => map.current?.resize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!map.current || !props.onMapClick) return;
    const handler = (event: any) => props.onMapClick?.([event.lnglat.getLng(), event.lnglat.getLat()]);
    map.current.on('click', handler);
    return () => map.current?.off('click', handler);
  }, [loading, props.onMapClick]);

  useEffect(() => {
    if (!map.current || !amap.current) return;
    for (const overlay of overlays.current) map.current.remove(overlay);
    overlays.current = [];
    const AMap = amap.current;
    if (props.draftPolygon?.length) {
      const draft = new AMap.Polygon({ path: props.draftPolygon, strokeColor: '#e88b18', strokeWeight: 4,
        fillColor: '#f3b44b', fillOpacity: 0.18, zIndex: 110, bubble: true });
      map.current.add(draft);
      overlays.current.push(draft);
    }
    for (const region of props.regions) {
      if (region.status !== 'published') continue;
      const polygon = new AMap.Polygon({
        path: region.polygon,
        fillColor: region.color,
        fillOpacity: props.selectedRegionId === region.id ? 0.38 : 0.22,
        strokeColor: region.color,
        strokeWeight: props.selectedRegionId === region.id ? 4 : 2,
        bubble: true,
      });
      polygon.on('click', () => { if (!mouseTool.current) props.onRegionSelect(region.id); });
      map.current.add(polygon);
      overlays.current.push(polygon);
      const label = new AMap.Text({ text: region.name, position: regionLabelPosition(region.polygon), anchor: 'center', zIndex: 120,
        style: { padding: '5px 11px', borderRadius: '16px', backgroundColor: 'rgba(16, 38, 56, .85)',
          color: '#fff', fontSize: '13px', fontWeight: '600', border: `1px solid ${region.color}`, whiteSpace: 'nowrap' } });
      label.on('click', () => { if (!mouseTool.current) props.onRegionSelect(region.id); });
      map.current.add(label);
      overlays.current.push(label);
    }
    for (const community of props.communities) {
      if (!community.visible) continue;
      const marker = new AMap.Marker({
        position: [community.longitude, community.latitude],
        title: community.name,
        label: { content: community.name, direction: 'top' },
      });
      marker.on('click', () => props.onCommunitySelect(community));
      const summary = props.summaries[community.id];
      const content = document.createElement('div');
      content.className = 'map-tooltip';
      const title = document.createElement('strong');
      title.textContent = community.name;
      content.append(title);
      for (const line of [
        summary?.saleAveragePerSquareMeter === null || summary?.saleAveragePerSquareMeter === undefined ? '在售：暂无房源' : `在售均价：${summary.saleAveragePerSquareMeter} 元/㎡（${summary.saleCount} 套）`,
        summary?.rentAverageMonthly === null || summary?.rentAverageMonthly === undefined ? '在租：暂无房源' : `月租均价：${summary.rentAverageMonthly} 元/月（${summary.rentCount} 套）`,
        community.summary || '配套摘要：暂无资料',
      ]) {
        const item = document.createElement('div');
        item.textContent = line;
        content.append(item);
      }
      const infoWindow = new AMap.InfoWindow({ content, offset: new AMap.Pixel(0, -30), isCustom: false });
      marker.on('mouseover', () => infoWindow.open(map.current, [community.longitude, community.latitude]));
      marker.on('mouseout', () => infoWindow.close());
      map.current.add(marker);
      overlays.current.push(marker);
    }
    for (const amenity of props.amenities) {
      const badge = document.createElement('div');
      badge.className = 'amenity-map-marker';
      badge.style.backgroundColor = amenity.color;
      badge.textContent = amenityMarkerText(amenity.typeLabel, amenity.type);
      const marker = new AMap.Marker({ position: [amenity.longitude, amenity.latitude], content: badge, title: amenity.name, offset: new AMap.Pixel(-15, -15), zIndex: 120 });
      const label = document.createElement('div');
      label.className = 'map-tooltip';
      label.textContent = `${amenity.name} · ${amenity.address}`;
      const infoWindow = new AMap.InfoWindow({ content: label, offset: new AMap.Pixel(0, -20) });
      marker.on('mouseover', () => infoWindow.open(map.current, [amenity.longitude, amenity.latitude]));
      marker.on('mouseout', () => infoWindow.close());
      if (props.onAmenitySelect) marker.on('click', () => props.onAmenitySelect?.(amenity));
      map.current.add(marker);
      overlays.current.push(marker);
    }
    const selected = props.regions.find((region) => region.id === props.selectedRegionId);
    if (props.focusPosition) map.current.setZoomAndCenter(16, props.focusPosition);
    else if (selected) {
      const bounds = new AMap.Bounds(
        [Math.min(...selected.polygon.map((p) => p[0])), Math.min(...selected.polygon.map((p) => p[1]))],
        [Math.max(...selected.polygon.map((p) => p[0])), Math.max(...selected.polygon.map((p) => p[1]))],
      );
      map.current.setBounds(bounds, false, [80, 80, 80, 80]);
    } else if (townBoundary.current) map.current.setFitView([townBoundary.current], false, [40, 40, 40, 40]);
  }, [loading, props.regions, props.communities, props.amenities, props.summaries, props.draftPolygon, props.selectedRegionId, props.focusPosition, props.onRegionSelect, props.onCommunitySelect, props.onAmenitySelect]);

  function startDrawing() {
    if (!map.current || !amap.current || !props.onPolygonDraw) return;
    if (mouseTool.current) { stopDrawing(); return; }
    mouseTool.current = new amap.current.MouseTool(map.current);
    mouseTool.current.on('draw', (event: any) => {
      const polygon = event.obj.getPath().map((point: any) => [point.getLng(), point.getLat()] as Position);
      stopDrawing();
      onPolygonDraw.current?.(polygon);
    });
    mouseTool.current.polygon({ strokeColor: '#1677ff', fillColor: '#1677ff', fillOpacity: 0.25 });
    setDrawing(true);
  }

  if (!mapKeyConfigured) {
    return <div className="map-fallback"><Empty description="请先在前端本地地图常量中填写 AMAP_JS_API_KEY" /></div>;
  }
  return <div className="map-wrap">
    <div ref={container} className="map-canvas" />
    {loading && <div className="map-overlay"><Spin description="地图加载中" /></div>}
    {error && <div className="map-overlay"><Empty description={error} /></div>}
    {!error && !loading && <div className="town-boundary-note">{props.overviewBoundary?.length ? '横店整体轮廓' : '尚未绘制横店轮廓'}</div>}
    {props.onPolygonDraw && !loading && !error &&
      <Button className="draw-button" type={drawing ? 'default' : 'primary'} onClick={startDrawing}>
        {drawing ? '取消绘制（Esc）' : props.drawLabel ?? '绘制片区边界'}</Button>}
  </div>;
}
