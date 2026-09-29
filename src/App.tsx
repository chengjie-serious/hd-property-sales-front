import { Alert, Button, DatePicker, Form, Image, Input, InputNumber, Layout, List, Modal, Popconfirm, Select, Space, Table, Tree, Typography, message } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Amenity, Community, CommunitySummary, Place, Position, Region, RouteSummary } from './api';
import { api } from './api';
import { MapView } from './MapView';
import { PropertyForms } from './PropertyForms';
import { PropertyBrowser } from './PropertyBrowser';
import { AdminApp } from './admin/AdminApp';

const { Header, Content, Sider } = Layout;
const amenityTypes = [
  { value: 'hospital', label: '医院', color: '#e74c3c' },
  { value: 'primary_school', label: '小学', color: '#f39c12' },
  { value: 'kindergarten', label: '幼儿园', color: '#e67eaf' },
  { value: 'middle_school', label: '初中', color: '#9b59b6' },
  { value: 'high_school', label: '高中', color: '#8e44ad' },
  { value: 'university', label: '大学', color: '#34495e' },
  { value: 'subway_station', label: '地铁', color: '#2980b9' },
  { value: 'bus_stop', label: '公交', color: '#3498db' },
  { value: 'elevated_entrance', label: '高架入口', color: '#7f8c8d' },
  { value: 'shopping_mall', label: '商场', color: '#d35400' },
  { value: 'gym', label: '健身房', color: '#27ae60' },
  { value: 'swimming_pool', label: '游泳池', color: '#16a085' },
  { value: 'school', label: '学校', color: '#f39c12' },
];
const amenityLabel = (type: string) => amenityTypes.find((item) => item.value === type)?.label ?? type;
const formatRoute = (route: RouteSummary) => `${route.distanceMeters >= 1000 ? `${(route.distanceMeters / 1000).toFixed(1)} 公里` : `${route.distanceMeters} 米`} · 约 ${Math.ceil(route.durationSeconds / 60)} 分钟`;
type CommunityFormValues = { regionId?: string; name: string; address: string; longitude: number; latitude: number; deliveryDate: { format: (format: string) => string }; summary?: string };
type AmenityFormValues = { communityIds: string[]; searchRegionId?: string; type: string; color: string; name: string; address: string; longitude: number; latitude: number; note?: string };

function PlaceSearch({ regionId, requireRegion = false, onSelect }: { regionId?: string; requireRegion?: boolean; onSelect: (place: Place) => void }) {
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setPlaces([]); setError(''); }, [regionId]);
  async function search() {
    if (!keyword.trim()) return;
    if (requireRegion && !regionId) { setError('请先选择搜索片区'); return; }
    setLoading(true);
    setError('');
    try { setPlaces(await api.places(keyword.trim(), regionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '搜索失败'); }
    finally { setLoading(false); }
  }
  return <div className="place-search">
    <Input.Search value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => void search()} loading={loading} placeholder="输入地点名称，在所选片区搜索" enterButton="搜索" />
    {error && <Alert type="error" message={error} showIcon className="search-alert" />}
    {places.length > 0 && <List size="small" bordered dataSource={places} renderItem={(place) => <List.Item className="place-result" onClick={() => { onSelect(place); setPlaces([]); setKeyword(place.name); }}><strong>{place.name}</strong><span>{place.address}</span></List.Item>} />}
    {!loading && keyword && places.length === 0 && !error && <Typography.Text type="secondary">搜索后请选择结果；若没有结果，可手动填写坐标。</Typography.Text>}
  </div>;
}

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminApp /> : <DisplayApp />;
}

function DisplayApp() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  const [regions, setRegions] = useState<Region[]>([]);
  const [overviewBoundary, setOverviewBoundary] = useState<Position[] | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CommunitySummary>>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [managedCommunity, setManagedCommunity] = useState<Community | null>(null);
  const [communityAmenities, setCommunityAmenities] = useState<Amenity[]>([]);
  const [chosenAmenityIds, setChosenAmenityIds] = useState<string[]>([]);
  const [routes, setRoutes] = useState<Record<string, { walking?: RouteSummary; driving?: RouteSummary; error?: string }>>({});
  const [error, setError] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [amenityOpen, setAmenityOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [batchRegionId, setBatchRegionId] = useState<string>();
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<string[]>(['unassigned']);
  const [regionForm] = Form.useForm();
  const [communityForm] = Form.useForm();
  const [amenityForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const communityRegionId = Form.useWatch('regionId', communityForm) as string | undefined;
  const amenitySearchRegionId = Form.useWatch('searchRegionId', amenityForm) as string | undefined;

  const refresh = useCallback(async () => {
    try {
      const [nextRegions, nextCommunities, nextAmenities, nextBoundary] = await Promise.all([api.regions(), isAdmin ? api.adminCommunities() : api.allCommunities(), api.allAmenities(), api.overviewBoundary()]);
      setRegions(nextRegions); setCommunities(nextCommunities); setAllAmenities(nextAmenities); setOverviewBoundary(nextBoundary.polygon); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '数据加载失败'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setExpandedTreeKeys((current) => [...new Set([...current, ...regions.map((item) => `region:${item.id}`), 'unassigned'])]); }, [regions]);
  useEffect(() => {
    let cancelled = false;
    if (!communities.length) { setSummaries({}); return; }
    void Promise.all(communities.map(async (community) => [community.id, await api.summary(community.id)] as const))
      .then((entries) => { if (!cancelled) setSummaries(Object.fromEntries(entries)); })
      .catch((cause) => { if (!cancelled) setError(String(cause)); });
    return () => { cancelled = true; };
  }, [communities]);
  useEffect(() => {
    setRoutes({});
    if (!selectedCommunity) { setCommunityAmenities([]); return; }
    const linked = allAmenities.filter((item) => item.communityIds.includes(selectedCommunity.id));
    setCommunityAmenities(linked);
    setChosenAmenityIds(linked.map((item) => item.id));
  }, [selectedCommunity, allAmenities]);

  const visibleCommunities = useMemo(() => communities.filter((item) => item.regionId !== null && (!selectedRegionId || item.regionId === selectedRegionId)), [communities, selectedRegionId]);
  const visibleAmenities = useMemo(() => allAmenities.filter((item) => item.communityIds.some((id) => visibleCommunities.some((community) => community.id === id))), [allAmenities, visibleCommunities]);
  const regionSaleAverage = useMemo(() => {
    const values = visibleCommunities.map((item) => summaries[item.id]).filter((item) => item?.saleAveragePerSquareMeter != null && item.saleCount > 0);
    const count = values.reduce((total, item) => total + item.saleCount, 0);
    return count ? Math.round(values.reduce((total, item) => total + (item.saleAveragePerSquareMeter ?? 0) * item.saleCount, 0) / count) : null;
  }, [visibleCommunities, summaries]);
  const selectRegion = useCallback((id: string) => { setSelectedRegionId(id); setSelectedCommunity(null); setManagedCommunity(null); }, []);
  const selectCommunity = useCallback((community: Community) => { setSelectedRegionId(community.regionId); setSelectedCommunity(community); setManagedCommunity(community); }, []);
  const regionOptions = regions.map((item) => ({ label: item.name, value: item.id }));
  const communityOptions = communities.map((item) => ({ label: `${item.name}${item.regionId ? ` · ${regions.find((r) => r.id === item.regionId)?.name ?? ''}` : ' · 无片区'}`, value: item.id }));

  function openRegion(region?: Region) {
    setCommunityOpen(false); setAmenityOpen(false);
    setEditingRegion(region ?? null);
    regionForm.setFieldsValue(region ? { name: region.name, color: region.color, polygon: JSON.stringify(region.polygon) } : { name: '', color: '#1677ff', polygon: '' });
    setRegionOpen(true);
  }
  function openCommunity(regionId?: string) {
    setRegionOpen(false); setAmenityOpen(false);
    communityForm.resetFields();
    communityForm.setFieldsValue({ regionId: regionId ?? undefined });
    setCommunityOpen(true);
  }
  function openAmenity(amenity?: Amenity) {
    setRegionOpen(false); setCommunityOpen(false);
    setEditingAmenity(amenity ?? null);
    amenityForm.setFieldsValue(amenity ? { ...amenity, searchRegionId: communities.find((c) => amenity.communityIds.includes(c.id))?.regionId ?? undefined }
      : { type: 'hospital', color: '#e74c3c', communityIds: managedCommunity ? [managedCommunity.id] : [], searchRegionId: managedCommunity?.regionId ?? selectedRegionId ?? undefined, name: '', address: '', note: '' });
    setAmenityOpen(true);
  }
  async function saveRegion(values: { name: string; color: string; polygon: string }) {
    try {
      const polygon = JSON.parse(values.polygon) as Position[];
      if (editingRegion) await api.updateRegion(editingRegion.id, { name: values.name, color: values.color, polygon });
      else await api.addRegion({ name: values.name, color: values.color, polygon });
      setRegionOpen(false); await refresh(); messageApi.success('片区已保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '片区保存失败'); }
  }
  async function saveCommunity(values: CommunityFormValues) {
    try {
      await api.addCommunity({ ...values, regionId: values.regionId ?? null, deliveryDate: values.deliveryDate.format('YYYY-MM-DD') });
      setCommunityOpen(false); await refresh(); messageApi.success('小区已保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '小区保存失败'); }
  }
  async function saveAmenity(values: AmenityFormValues) {
    try {
      const input = { ...values, communityIds: values.communityIds ?? [] };
      if (editingAmenity) await api.updateAmenity(editingAmenity.id, input);
      else await api.addAmenity(input);
      setAmenityOpen(false); await refresh(); messageApi.success('配套已保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '配套保存失败'); }
  }
  async function removeRegion(region: Region) {
    try { await api.deleteRegion(region.id); if (selectedRegionId === region.id) setSelectedRegionId(null); setSelectedCommunity(null); setManagedCommunity(null); await refresh(); setUnassignedOpen(true); messageApi.success('片区已删除，关联小区已移至废弃小区站'); }
    catch (cause) { messageApi.error(String(cause)); }
  }
  async function removeCommunity(id: string) {
    try { await api.deleteCommunity(id); if (selectedCommunity?.id === id) setSelectedCommunity(null); if (managedCommunity?.id === id) setManagedCommunity(null); await refresh(); setUnassignedOpen(true); messageApi.success('小区已移至废弃小区站'); }
    catch (cause) { messageApi.error(String(cause)); }
  }
  async function removeAmenity(id: string) {
    try { await api.deleteAmenity(id); await refresh(); messageApi.success('设施已删除'); }
    catch (cause) { messageApi.error(String(cause)); }
  }
  async function saveCommunityAmenities() {
    if (!selectedCommunity) return;
    try {
      await Promise.all(allAmenities.filter((item) => chosenAmenityIds.includes(item.id) !== item.communityIds.includes(selectedCommunity.id)).map((item) =>
        api.updateAmenity(item.id, { ...item, communityIds: chosenAmenityIds.includes(item.id)
          ? [...item.communityIds, selectedCommunity.id] : item.communityIds.filter((id) => id !== selectedCommunity.id) })));
      await refresh(); messageApi.success('小区配套已更新');
    } catch (cause) { messageApi.error(String(cause)); }
  }
  async function batchAssign() {
    if (!batchIds.length || !batchRegionId) return;
    try { await api.assignCommunities(batchIds, batchRegionId); setBatchIds([]); await refresh(); messageApi.success('批量归属完成'); }
    catch (cause) { messageApi.error(String(cause)); }
  }
  async function batchDelete() {
    if (!batchIds.length) return;
    try { await api.deleteCommunities(batchIds); setBatchIds([]); await refresh(); messageApi.success('批量删除完成'); }
    catch (cause) { messageApi.error(String(cause)); }
  }
  async function loadRoutes(amenity: Amenity) {
    if (!selectedCommunity) return;
    const origin: Position = [selectedCommunity.longitude, selectedCommunity.latitude];
    const destination: Position = [amenity.longitude, amenity.latitude];
    const result = await Promise.allSettled([api.route('walking', origin, destination), api.route('driving', origin, destination)]);
    const walking = result[0].status === 'fulfilled' ? result[0].value : undefined;
    const driving = result[1].status === 'fulfilled' ? result[1].value : undefined;
    setRoutes((current) => ({ ...current, [amenity.id]: { walking, driving, error: !walking && !driving ? '暂无可用路线，请检查 Web 服务 Key 与网络' : undefined } }));
  }
  const action = (label: string, onClick: () => void) => <Button type="text" size="small" onClick={(event) => { event.stopPropagation(); onClick(); }}>{label}</Button>;
  const treeData = [
    ...regions.map((region) => ({ key: `region:${region.id}`, title: <span className="tree-title"><span><i className={classNames('region-dot', { 'region-dot-selected': selectedRegionId === region.id })} style={{ '--region-color': region.color } as CSSProperties} />{region.name}</span>{isAdmin && <span className="tree-actions">{action('＋', () => openCommunity(region.id))}{action('编辑', () => openRegion(region))}<Popconfirm title="删除片区？关联小区会移至废弃小区站" onConfirm={() => void removeRegion(region)}>{action('删除', () => {})}</Popconfirm></span>}</span>, children: communities.filter((item) => item.regionId === region.id).map((item) => ({ key: `community:${item.id}`, title: <span className="tree-title"><span>{item.name}</span>{isAdmin && <Popconfirm title="移至废弃小区站？房源会保留" onConfirm={() => void removeCommunity(item.id)}>{action('移除', () => {})}</Popconfirm>}</span> })) })),
    ...(isAdmin ? [{ key: 'unassigned', title: <span className="tree-title"><span>废弃小区站（{communities.filter((item) => !item.regionId).length}）</span></span>, children: communities.filter((item) => !item.regionId).map((item) => ({ key: `community:${item.id}`, title: item.name })) }] : []),
  ];
  return <Layout className="app-layout">
    {contextHolder}
    <Header className="app-header"><div className="brand"><span className="brand-mark">横</span><span>横店楼盘地图</span></div><Space><Typography.Text className="header-hint">个人房源与片区信息</Typography.Text></Space></Header>
    <Layout className="body-layout">
      <Sider theme="light" width={340} className="sidebar"><div className="sidebar-heading"><div className="eyebrow">HENGDIAN · PROPERTY MAP</div><h1>{isAdmin ? '片区与设施管理' : '探索横店片区'}</h1></div>
        {error && <Alert type="error" message={error} showIcon className="side-alert" />}
        <div className="sidebar-tree-heading"><strong>片区 / 小区</strong>{isAdmin && <Button size="small" onClick={() => openRegion()}>新增片区</Button>}</div>
        <Button type="link" className="overview-action" onClick={() => { setSelectedRegionId(null); setSelectedCommunity(null); setManagedCommunity(null); }}>横店总览</Button>
        <Tree blockNode treeData={treeData} expandedKeys={expandedTreeKeys} onExpand={(keys) => setExpandedTreeKeys(keys.map(String))} selectedKeys={selectedCommunity ? [`community:${selectedCommunity.id}`] : selectedRegionId ? [`region:${selectedRegionId}`] : []} onSelect={(keys) => { const key = String(keys[0] ?? ''); if (key === 'unassigned') { if (isAdmin) setUnassignedOpen(true); else { setSelectedRegionId(null); setSelectedCommunity(null); } } else if (key.startsWith('region:')) selectRegion(key.slice(7)); else if (key.startsWith('community:')) { const found = communities.find((item) => item.id === key.slice(10)); if (found) selectCommunity(found); } }} />
        {isAdmin && <><div className="sidebar-tree-heading facility-heading"><strong>周边设施</strong><Button size="small" onClick={() => openAmenity()}>新增设施</Button></div><Tree blockNode treeData={allAmenities.map((item) => ({ key: `amenity:${item.id}`, title: <span className="tree-title"><span><i className="region-dot" style={{ '--region-color': item.color } as CSSProperties} />{item.name}</span><span className="tree-actions">{action('编辑', () => openAmenity(item))}<Popconfirm title="删除设施？" onConfirm={() => void removeAmenity(item.id)}>{action('删除', () => {})}</Popconfirm></span></span> }))} onSelect={(keys) => { const found = allAmenities.find((item) => `amenity:${item.id}` === keys[0]); if (found) openAmenity(found); }} /></>}
      </Sider>
      <Content className="main-content"><div className="map-heading"><div><div className="eyebrow">MAP OVERVIEW</div><h2>{selectedRegionId ? regions.find((r) => r.id === selectedRegionId)?.name : '横店影视城区域总览'}</h2></div><Space>{isAdmin && <Button onClick={() => openCommunity(selectedRegionId ?? undefined)}>新增小区</Button>}{selectedRegionId && <Button onClick={() => setSelectedRegionId(null)}>返回总览</Button>}</Space></div>
        <MapView regions={regions} communities={visibleCommunities} amenities={isAdmin ? allAmenities : visibleAmenities} summaries={summaries} selectedRegionId={selectedRegionId} onRegionSelect={selectRegion} onCommunitySelect={selectCommunity} overviewBoundary={overviewBoundary} manualBoundaryMode onPolygonDraw={isAdmin ? (polygon) => { if (!regionOpen) openRegion(); regionForm.setFieldValue('polygon', JSON.stringify(polygon)); messageApi.success('边界已绘制，请填写名称并保存'); } : undefined} />
        {isAdmin && <PropertyForms communityId={managedCommunity?.id ?? null} communityName={managedCommunity?.name} />}
      </Content>
      {(regionOpen || communityOpen || amenityOpen || selectedCommunity || (!isAdmin && selectedRegionId)) && <Sider theme="light" width={420} className="right-panel">
        {regionOpen && <section className="right-panel-content"><div className="right-panel-heading"><h3>{editingRegion ? '编辑片区' : '新增片区'}</h3><Button type="text" onClick={() => setRegionOpen(false)}>关闭</Button></div><Form form={regionForm} layout="vertical" onFinish={(values) => void saveRegion(values)}><Form.Item label="片区名称" name="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="片区颜色" name="color" rules={[{ required: true }]}><Input type="color" /></Form.Item><Form.Item label="边界坐标" name="polygon" rules={[{ required: true }]} extra="在地图绘制，或填写 [[经度,纬度], ...]"><Input.TextArea rows={4} /></Form.Item><Space className="side-form-actions"><Button onClick={() => setRegionOpen(false)}>取消</Button><Button type="primary" htmlType="submit">保存</Button></Space></Form></section>}
        {communityOpen && <section className="right-panel-content"><div className="right-panel-heading"><h3>新增小区</h3><Button type="text" onClick={() => setCommunityOpen(false)}>关闭</Button></div><Form form={communityForm} layout="vertical" onFinish={(values) => void saveCommunity(values)}><Form.Item label="所属片区" name="regionId"><Select allowClear options={regionOptions} placeholder="不选择则归入无片区小区" /></Form.Item><PlaceSearch regionId={communityRegionId} onSelect={(place) => communityForm.setFieldsValue({ name: communityForm.getFieldValue('name') || place.name, address: place.address || place.name, longitude: place.longitude, latitude: place.latitude })} /><Form.Item label="小区名称" name="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="地址" name="address" rules={[{ required: true }]}><Input /></Form.Item><div className="form-row"><Form.Item label="经度" name="longitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item><Form.Item label="纬度" name="latitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item></div><Form.Item label="交付日期" name="deliveryDate" rules={[{ required: true }]}><DatePicker className="full-width" /></Form.Item><Form.Item label="配套摘要" name="summary"><Input.TextArea rows={2} /></Form.Item><Space className="side-form-actions"><Button onClick={() => setCommunityOpen(false)}>取消</Button><Button type="primary" htmlType="submit">保存</Button></Space></Form></section>}
        {amenityOpen && <section className="right-panel-content"><div className="right-panel-heading"><h3>{editingAmenity ? '编辑周边设施' : '新增周边设施'}</h3><Button type="text" onClick={() => setAmenityOpen(false)}>关闭</Button></div><Form form={amenityForm} layout="vertical" onFinish={(values) => void saveAmenity(values)}><Form.Item label="搜索片区" name="searchRegionId" rules={[{ required: true, message: '请选择搜索片区' }]} extra="仅用于限制地点搜索范围，不绑定设施"><Select allowClear options={regionOptions} /></Form.Item><PlaceSearch regionId={amenitySearchRegionId} requireRegion onSelect={(place) => amenityForm.setFieldsValue({ name: amenityForm.getFieldValue('name') || place.name, address: place.address || place.name, longitude: place.longitude, latitude: place.latitude })} /><Form.Item label="关联小区" name="communityIds"><Select mode="multiple" options={communityOptions} placeholder="可选择多个小区" /></Form.Item><Form.Item label="类型" name="type" rules={[{ required: true }]}><Select options={amenityTypes.map(({ value, label }) => ({ value, label }))} onChange={(type) => amenityForm.setFieldValue('color', amenityTypes.find((item) => item.value === type)?.color)} /></Form.Item><Form.Item label="标记颜色" name="color" rules={[{ required: true }]}><Input type="color" /></Form.Item><Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="地址" name="address" rules={[{ required: true }]}><Input /></Form.Item><div className="form-row"><Form.Item label="经度" name="longitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item><Form.Item label="纬度" name="latitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item></div><Form.Item label="备注" name="note"><Input.TextArea rows={2} /></Form.Item><Space className="side-form-actions"><Button onClick={() => setAmenityOpen(false)}>取消</Button><Button type="primary" htmlType="submit">保存</Button></Space></Form></section>}
        {!(regionOpen || communityOpen || amenityOpen) && selectedCommunity && <section className="right-panel-content"><div className="right-panel-heading"><h3>{selectedCommunity.name}</h3><Button type="text" onClick={() => setSelectedCommunity(null)}>关闭</Button></div><Space direction="vertical" size="large" className="detail-content"><div><span className="detail-label">地址</span><div>{selectedCommunity.address}</div></div><div><span className="detail-label">交付日期</span><div>{selectedCommunity.deliveryDate}</div></div><div><span className="detail-label">小区简介</span><div>{selectedCommunity.description || '暂无资料'}</div></div><div className="community-image-previews">{selectedCommunity.mainMediaId && <Image src={`/api/media/${selectedCommunity.mainMediaId}`} width={180} />}{selectedCommunity.detailMediaIds.map((id) => <Image key={id} src={`/api/media/${id}`} width={130} />)}</div><div><span className="detail-label">配套摘要</span><div>{selectedCommunity.summary || '暂无资料'}</div></div><div className="amenities-section"><h3>周边配套</h3>{isAdmin && <Space direction="vertical" className="community-amenity-editor"><Select mode="multiple" className="full-width" value={chosenAmenityIds} onChange={setChosenAmenityIds} options={allAmenities.map((item) => ({ value: item.id, label: item.name }))} placeholder="选择已有设施" /><Button onClick={() => void saveCommunityAmenities()}>保存关联设施</Button></Space>}<List dataSource={communityAmenities} locale={{ emptyText: '暂无配套资料' }} renderItem={(item) => { const route = routes[item.id]; return <List.Item><div className="amenity-item"><div className="amenity-heading"><strong>{item.name}</strong><span>{amenityLabel(item.type)}</span></div><div className="amenity-address">{item.address}</div>{item.note && <div className="amenity-address">{item.note}</div>}<Button size="small" onClick={() => void loadRoutes(item)}>查询步行 / 驾车路线</Button>{route?.walking && <div className="route-result">步行：{formatRoute(route.walking)}</div>}{route?.driving && <div className="route-result">驾车：{formatRoute(route.driving)}</div>}{route?.error && <div className="route-error">{route.error}</div>}</div></List.Item>; }} /></div><PropertyBrowser community={selectedCommunity} /></Space></section>}
        {!isAdmin && !selectedCommunity && selectedRegionId && <section className="right-panel-content"><div className="right-panel-heading"><h3>{regions.find((item) => item.id === selectedRegionId)?.name}</h3><Button type="text" onClick={() => setSelectedRegionId(null)}>关闭</Button></div><div className="region-stats"><div>小区数量：{visibleCommunities.length}</div><div>在售房源：{visibleCommunities.reduce((total, item) => total + (summaries[item.id]?.saleCount ?? 0), 0)} 套</div><div>在售均价：{regionSaleAverage === null ? '暂无' : `${regionSaleAverage} 元/㎡`}</div><div>周边设施：{visibleAmenities.length} 处</div></div><List size="small" dataSource={visibleAmenities} renderItem={(item) => <List.Item><i className="region-dot" style={{ '--region-color': item.color } as CSSProperties} />{item.name} · {amenityLabel(item.type)}</List.Item>} /></section>}
      </Sider>}
    </Layout>
    <Modal title="废弃小区站" open={unassignedOpen} onCancel={() => setUnassignedOpen(false)} footer={null} width={760}><Space className="batch-actions"><Select placeholder="选择目标片区" value={batchRegionId} onChange={setBatchRegionId} options={regionOptions} className="batch-region-select" /><Button type="primary" disabled={!batchIds.length || !batchRegionId} onClick={() => void batchAssign()}>批量加入片区</Button><Popconfirm title="永久删除选中小区及其房源？此操作无法恢复" onConfirm={() => void batchDelete()}><Button danger disabled={!batchIds.length}>永久删除</Button></Popconfirm></Space><Table rowKey="id" size="small" dataSource={communities.filter((item) => !item.regionId)} rowSelection={{ selectedRowKeys: batchIds, onChange: (keys) => setBatchIds(keys.map(String)) }} columns={[{ title: '小区', dataIndex: 'name' }, { title: '地址', dataIndex: 'address' }]} pagination={{ pageSize: 10 }} /></Modal>
  </Layout>;
}
