import { Button, Modal, Popconfirm, Select, Space, Table, Tree, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api, type Amenity, type Building, type Community, type Listing, type Position, type Region } from '../api';
import { MapView } from '../MapView';
import { getAncestorPath } from '../domain/tree-ancestor-path';
import { CommunityEditor } from './CommunityEditor';
import { CommunityQuickActions } from './CommunityQuickActions';
import { RegionEditor } from './RegionEditor';

type Props = {
  regions: Region[]; communities: Community[]; amenities: Amenity[]; listings: Listing[]; boundary: Position[] | null;
  reload: () => Promise<void>; focusCommunityId?: string | null;
};
type TreeNode = { key: string; title: string; children?: TreeNode[] };

export function CommunitiesPage({ regions, communities, amenities, listings, boundary, reload, focusCommunityId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Community | 'new' | null>(null);
  const [regionEditor, setRegionEditor] = useState<Region | 'new' | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<Position[] | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [structures, setStructures] = useState<Record<string, Building[]>>({});
  const [focusPosition, setFocusPosition] = useState<Position | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [firstVisibleKey, setFirstVisibleKey] = useState<string>('');
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [targetRegionId, setTargetRegionId] = useState<string>();
  const [messageApi, holder] = message.useMessage();
  const selected = communities.find((item) => item.id === selectedId);
  const discarded = communities.filter((item) => item.regionId === null);
  useEffect(() => { if (focusCommunityId) setSelectedId(focusCommunityId); }, [focusCommunityId]);
  useEffect(() => { setExpandedKeys((keys) => keys.length ? keys : [...regions.map((region) => 'region:' + region.id), 'discarded']); }, [regions]);
  useEffect(() => {
    let active = true;
    void Promise.all(communities.filter((item) => item.regionId !== null).map(async (item) =>
      [item.id, await api.structure(item.id)] as const)).then((entries) => {
        if (active) setStructures(Object.fromEntries(entries));
      }).catch((error) => { if (active) messageApi.error(String(error)); });
    return () => { active = false; };
  }, [communities, listings, messageApi]);
  const treeData = useMemo<TreeNode[]>(() => {
    const communityNode = (community: Community): TreeNode => ({ key: 'community:' + community.id, title: community.name,
      children: (structures[community.id] ?? []).map((building): TreeNode => ({ key: 'building:' + building.id, title: building.number + ' 幢',
        children: building.units.map((unit): TreeNode => ({ key: 'unit:' + unit.id, title: unit.number + ' 单元',
          children: [...new Set(unit.rooms.map((room) => room.floor))].sort((a, b) => a - b).map((floor): TreeNode => ({
            key: 'floor:' + unit.id + ':' + floor, title: floor + ' 层',
            children: unit.rooms.filter((room) => room.floor === floor).map((room): TreeNode => ({
              key: 'room:' + community.id + ':' + room.id,
              title: room.number + ' 室' +
                (listings.some((listing) => listing.roomId === room.id && listing.type === 'sale') ? ' · 售' : '') +
                (listings.some((listing) => listing.roomId === room.id && listing.type === 'rent') ? ' · 租' : ''),
            })),
          })),
        })),
      })),
    });
    return [...regions.map((region): TreeNode => ({ key: 'region:' + region.id, title: region.name,
      children: communities.filter((item) => item.regionId === region.id).map(communityNode) })),
      { key: 'discarded', title: '废弃小区站（' + discarded.length + '）', children: discarded.map(communityNode) }];
  }, [communities, discarded, listings, regions, structures]);
  const parentByKey = useMemo(() => {
    const result: Record<string, string | null> = {};
    const walk = (nodes: TreeNode[], parent: string | null) => {
      nodes.forEach((node) => { result[node.key] = parent; walk(node.children ?? [], node.key); });
    };
    walk(treeData, null); return result;
  }, [treeData]);
  const ancestors = getAncestorPath(firstVisibleKey, parentByKey).map((key) => {
    const find = (nodes: TreeNode[]): TreeNode | undefined => {
      for (const node of nodes) { if (node.key === key) return node; const child = find(node.children ?? []); if (child) return child; }
    };
    return find(treeData)?.title;
  }).filter(Boolean);
  async function run(action: () => Promise<unknown>, success: string) {
    try { await action(); await reload(); messageApi.success(success); }
    catch (error) { messageApi.error(error instanceof Error ? error.message : '操作失败'); }
  }
  function chooseCommunity(community: Community) {
    setSelectedId(community.id); setSelectedRegionId(community.regionId);
    setFocusPosition([community.longitude, community.latitude]);
  }
  return <div className="admin-page">{holder}
    <div className="admin-page-heading"><div><h2>片区与小区</h2><Typography.Text type="secondary">在地图维护片区与小区，房屋挂牌在独立菜单维护</Typography.Text></div>
      <Button onClick={() => setQuickOpen(true)}>快速操作</Button></div>
    <div className="admin-directory-layout">
      <div className="admin-directory-tree admin-directory-tree-managed">
        <div className="admin-tree-actions"><Button size="small" type="primary" onClick={() => { setRegionEditor('new'); setDrawnPolygon(null); }}>新增片区</Button>
          <Button size="small" onClick={() => setEditor('new')}>新增小区</Button></div>
        <div className="admin-tree-scroll" onScroll={(event) => {
          const container = event.currentTarget;
          const nodes = [...container.querySelectorAll<HTMLElement>('[role="treeitem"]')];
          const top = container.getBoundingClientRect().top;
          const visible = nodes.find((node) => node.getBoundingClientRect().bottom > top + 8);
          const key = Object.keys(parentByKey).find((candidate) => visible?.id.endsWith('-' + candidate));
          if (key) setFirstVisibleKey(key);
        }}>
          {!!ancestors.length && <div className="admin-tree-path">{ancestors.join(' / ')}</div>}
          <Tree blockNode treeData={treeData} expandedKeys={expandedKeys} onExpand={(keys) => setExpandedKeys(keys)}
            selectedKeys={selectedId ? ['community:' + selectedId] : selectedRegionId ? ['region:' + selectedRegionId] : []}
            onSelect={(keys) => {
              const key = String(keys[0] ?? '');
              if (key.startsWith('region:')) { setSelectedRegionId(key.slice(7)); setSelectedId(null); }
              else if (key.startsWith('community:')) { const item = communities.find((community) => community.id === key.slice(10)); if (item) chooseCommunity(item); }
              else if (key.startsWith('room:')) { const item = communities.find((community) => community.id === key.split(':')[1]); if (item) chooseCommunity(item); }
              else if (key === 'discarded') { setSelectedId(null); setSelectedRegionId(null); }
            }} />
        </div>
      </div>
      <div className="admin-directory-content">
        <div className="admin-community-map"><MapView regions={regions} communities={communities.filter((item) => item.regionId !== null)}
          amenities={amenities} summaries={{}} selectedRegionId={selectedRegionId} onRegionSelect={(id) => { setSelectedRegionId(id); setSelectedId(null); }}
          onCommunitySelect={chooseCommunity} overviewBoundary={boundary} manualBoundaryMode focusPosition={focusPosition}
          onMapClick={editor ? (position) => setFocusPosition(position) : undefined}
          onPolygonDraw={regionEditor ? (polygon) => setDrawnPolygon(polygon) : undefined}
          drawLabel="绘制片区边界" /></div>
        {selected ? <div className="admin-work-panel"><div className="admin-panel-title"><h3>{selected.name}</h3>
          <Space><Button onClick={() => setEditor(selected)}>编辑小区</Button>
            <Popconfirm title={selected.regionId ? '移入废弃小区站？' : '永久删除小区及其房源和图片？'}
              onConfirm={() => void run(async () => { await api.deleteCommunity(selected.id); setSelectedId(null); }, selected.regionId ? '已移入废弃站' : '已永久删除')}>
              <Button danger>{selected.regionId ? '移至废弃站' : '永久删除'}</Button></Popconfirm></Space></div>
          <p>{selected.address} · {regions.find((region) => region.id === selected.regionId)?.name ?? '废弃小区站'}</p>
          <p>交付日期：{selected.deliveryDate}　规划楼幢：{selected.buildingCount}　已录入：{structures[selected.id]?.length ?? 0} 幢</p>
          <p>参考出售均价：{selected.referenceSalePrice ?? '暂无'} 元/㎡　热门：{selected.isHot ? '是' : '否'}</p>
          <p>经纬度：{selected.longitude}, {selected.latitude}　配套摘要：{selected.summary || '暂无'}</p>
          <p>关联设施：{amenities.filter((item) => item.communityIds.includes(selected.id)).map((item) => item.name).join('、') || '暂无'}</p>
        </div> : selectedRegionId ? <div className="admin-work-panel"><div className="admin-panel-title"><h3>{regions.find((region) => region.id === selectedRegionId)?.name}</h3>
          <Space><Button onClick={() => setRegionEditor(regions.find((region) => region.id === selectedRegionId) ?? null)}>编辑片区</Button>
            <Popconfirm title="删除片区？关联小区进入废弃小区站" onConfirm={() => void run(async () => { await api.deleteRegion(selectedRegionId); setSelectedRegionId(null); }, '片区已删除')}>
              <Button danger>删除片区</Button></Popconfirm></Space></div></div>
          : <div className="admin-work-panel"><div className="admin-panel-title"><h3>废弃小区站</h3><span>{discarded.length} 个</span></div>
            <Space><Select placeholder="选择目标片区" value={targetRegionId} onChange={setTargetRegionId}
              options={regions.map((item) => ({ label: item.name, value: item.id }))} style={{ width: 180 }} />
              <Button disabled={!batchIds.length || !targetRegionId} onClick={() => void run(async () => { await api.assignCommunities(batchIds, targetRegionId!); setBatchIds([]); }, '已移回片区')}>批量移回片区</Button>
              <Popconfirm title="永久删除选中小区及其房源图片？" onConfirm={() => void run(async () => { await api.deleteCommunities(batchIds); setBatchIds([]); }, '已永久删除')}>
                <Button danger disabled={!batchIds.length}>永久删除</Button></Popconfirm></Space>
            <Table rowKey="id" size="small" dataSource={discarded} rowSelection={{ selectedRowKeys: batchIds, onChange: (keys) => setBatchIds(keys.map(String)) }}
              columns={[{ title: '小区', dataIndex: 'name' }, { title: '地址', dataIndex: 'address' },
                { title: '操作', render: (_, row) => <Button size="small" onClick={() => setEditor(row)}>编辑</Button> }]} /></div>}
      </div>
    </div>
    <Modal open={Boolean(selected && editor === null)} title={selected ? selected.name + ' · 小区详情' : '小区详情'}
      onCancel={() => setSelectedId(null)} footer={null} width={900} destroyOnHidden>
      {selected && <div className="admin-work-panel"><div className="admin-panel-title"><h3>{selected.name}</h3>
        <Space><Button type="primary" onClick={() => setEditor(selected)}>编辑小区</Button>
          <Popconfirm title={selected.regionId ? '移入废弃小区站？' : '永久删除小区及其房源和图片？'}
            onConfirm={() => void run(async () => { await api.deleteCommunity(selected.id); setSelectedId(null); }, selected.regionId ? '已移入废弃站' : '已永久删除')}>
            <Button danger>{selected.regionId ? '移至废弃站' : '永久删除'}</Button></Popconfirm></Space></div>
        <p>所属片区：{regions.find((region) => region.id === selected.regionId)?.name ?? '废弃小区站'}　热门：{selected.isHot ? '是' : '否'}　展示：{selected.visible ? '是' : '否'}</p>
        <p>地址：{selected.address}</p><p>交付日期：{selected.deliveryDate}</p>
        <p>规划楼幢数：{selected.buildingCount}　已录入：{structures[selected.id]?.length ?? 0} 幢</p>
        <p>参考出售均价：{selected.referenceSalePrice ?? '暂无'} 元/㎡</p>
        <p>经纬度：{selected.longitude}, {selected.latitude}</p><p>配套摘要：{selected.summary || '暂无'}</p>
        <p>关联设施：{amenities.filter((item) => item.communityIds.includes(selected.id)).map((item) => item.name).join('、') || '暂无'}</p>
      </div>}
    </Modal>
    <Modal open={editor !== null} title={editor === 'new' ? '新增小区' : '小区详情 · 编辑'} onCancel={() => setEditor(null)} footer={null} width={760} mask={false} style={{ marginRight: 24 }} destroyOnHidden>
      {editor && <CommunityEditor community={editor === 'new' ? undefined : editor} regions={regions} amenities={amenities}
        actualBuildingCount={editor === 'new' ? 0 : structures[editor.id]?.length ?? 0} initialRegionId={selectedRegionId} mapPosition={focusPosition}
        onSaved={async () => { await reload(); setEditor(null); }} onCancel={() => setEditor(null)} />}
    </Modal>
    <RegionEditor open={regionEditor !== null} region={regionEditor === 'new' ? undefined : regionEditor ?? undefined}
      polygon={drawnPolygon} onClose={() => setRegionEditor(null)} onSaved={reload} />
    <CommunityQuickActions open={quickOpen} onClose={() => setQuickOpen(false)} communities={communities} regions={regions}
      reload={reload} onEdit={(item) => { setQuickOpen(false); chooseCommunity(item); setEditor(item); }} />
  </div>;
}
