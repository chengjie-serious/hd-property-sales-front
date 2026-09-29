import { Alert, Button, Layout, Menu, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, type Amenity, type AmenityType, type Community, type Listing, type Position, type Region } from '../api';
import { CommunitiesPage } from './CommunitiesPage';
import { DictionaryPage } from './DictionaryPage';
import { FacilitiesPage } from './FacilitiesPage';
import { ListingsPage } from './ListingsPage';

type MenuKey = 'communities' | 'listings' | 'facilities' | 'dictionary';
const items: Array<{ key: MenuKey; label: string }> = [
  { key: 'communities', label: '片区与小区' },
  { key: 'listings', label: '出售 / 租赁房屋列表' }, { key: 'facilities', label: '周边设施' },
  { key: 'dictionary', label: '字典列表' },
];

export function AdminApp() {
  const [menu, setMenu] = useState<MenuKey>('communities');
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [types, setTypes] = useState<AmenityType[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [boundary, setBoundary] = useState<Position[] | null>(null);
  const [focusCommunityId, setFocusCommunityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const [nextRegions, nextCommunities, nextAmenities, nextTypes, nextListings, nextBoundary] = await Promise.all([
        api.regions(), api.adminCommunities(), api.allAmenities(), api.amenityTypes(), api.allAdminListings(), api.overviewBoundary(),
      ]);
      setRegions(nextRegions); setCommunities(nextCommunities); setAmenities(nextAmenities); setTypes(nextTypes);
      setListings(nextListings); setBoundary(nextBoundary.polygon); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '管理数据加载失败'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return <Layout className="app-layout admin-shell">
    <Layout.Header className="app-header"><div className="brand"><span className="brand-mark">横</span><span>横店楼盘地图 · 管理后台</span></div></Layout.Header>
    <Layout className="body-layout"><Layout.Sider theme="light" width={236} collapsible collapsed={menuCollapsed} collapsedWidth={64}
      trigger={null} className="admin-main-sidebar">
      <div className="sidebar-heading"><Button type="text" aria-label={menuCollapsed ? '展开菜单' : '收起菜单'} onClick={() => setMenuCollapsed((current) => !current)}>{menuCollapsed ? '☰' : '☰ 收起'}</Button>
        {!menuCollapsed && <><div className="eyebrow">ADMIN CONSOLE</div><h1>管理菜单</h1></>}</div>
      <Menu mode="inline" inlineCollapsed={menuCollapsed} selectedKeys={[menu]} items={items.map((item, index) => ({ ...item, icon: <span>{['区', '房', '设', '字'][index]}</span> }))}
        onClick={({ key }) => setMenu(key as MenuKey)} />
    </Layout.Sider><Layout.Content className="admin-main-content">
      {error && <Alert type="error" showIcon message={error} className="admin-global-error" />}
      {loading ? <div className="admin-loading"><Spin /><Typography.Text>加载管理数据中</Typography.Text></div> : <>
        {menu === 'communities' && <CommunitiesPage regions={regions} communities={communities} amenities={amenities} listings={listings} boundary={boundary} reload={reload} focusCommunityId={focusCommunityId} />}
        {menu === 'listings' && <ListingsPage listings={listings} regions={regions} communities={communities} reload={reload} openCommunity={(id) => { setFocusCommunityId(id); setMenu('communities'); }} />}
        {menu === 'facilities' && <FacilitiesPage amenities={amenities} types={types} communities={communities} regions={regions} boundary={boundary} reload={reload} />}
        {menu === 'dictionary' && <DictionaryPage types={types} amenities={amenities} reload={reload} />}
      </>}
    </Layout.Content></Layout>
  </Layout>;
}
