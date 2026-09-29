import { Button, Image, Modal, Popconfirm, Space, Tree, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [discardedOnly, setDiscardedOnly] = useState(false);
  const [structures, setStructures] = useState<Record<string, Building[]>>({});
  const [focusPosition, setFocusPosition] = useState<Position | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [firstVisibleKey, setFirstVisibleKey] = useState<string>('');
  const [messageApi, holder] = message.useMessage();
  const treeScrollRef = useRef<HTMLDivElement>(null);
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
      children: (structures[community.id] ?? []).map((building): TreeNode => ({ key: 'building:' + community.id + ':' + building.id, title: building.number + ' 幢',
        children: building.units.map((unit): TreeNode => ({ key: 'unit:' + community.id + ':' + unit.id, title: unit.number + ' 单元',
          children: [...new Set(unit.rooms.map((room) => room.floor))].sort((a, b) => a - b).map((floor): TreeNode => ({
            key: 'floor:' + community.id + ':' + unit.id + ':' + floor, title: floor + ' 层',
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
  }, [communities, listings, regions, structures]);
  const parentByKey = useMemo(() => {
    const result: Record<string, string | null> = {};
    const walk = (nodes: TreeNode[], parent: string | null) => {
      nodes.forEach((node) => { result[node.key] = parent; walk(node.children ?? [], node.key); });
    };
    walk(treeData, null); return result;
  }, [treeData]);
  const updateFirstVisible = useCallback(() => {
    const container = treeScrollRef.current;
    if (!container) return;
    const nodes = [...container.querySelectorAll<HTMLElement>('[role="treeitem"]')];
    const top = container.getBoundingClientRect().top;
    const visible = nodes.find((node) => node.getBoundingClientRect().bottom > top + 8);
    const key = Object.keys(parentByKey).find((candidate) => visible?.id.endsWith('-' + candidate));
    setFirstVisibleKey(key ?? '');
  }, [parentByKey]);
  useEffect(() => { updateFirstVisible(); }, [expandedKeys, updateFirstVisible]);
  const ancestorKeys = getAncestorPath(firstVisibleKey, parentByKey);
  const ancestors = ancestorKeys.map((key) => {
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
  return <div className="admin-page admin-communities-page">{holder}
    <div className="admin-page-heading"><div><h2>片区与小区</h2><Typography.Text type="secondary">在地图维护片区与小区，房屋挂牌在独立菜单维护</Typography.Text></div>
      <Space>{selectedRegionId && !selected && <><Button onClick={() => setRegionEditor(regions.find((region) => region.id === selectedRegionId) ?? null)}>编辑片区</Button>
        <Popconfirm title="删除片区？关联小区进入废弃小区站" onConfirm={() => void run(async () => { await api.deleteRegion(selectedRegionId); setSelectedRegionId(null); }, '片区已删除')}>
          <Button danger>删除片区</Button></Popconfirm></>}
        <Button onClick={() => { setSelectedId(null); setRegionEditor(null); setEditor('new'); setFocusPosition(null); }}>新增小区</Button></Space></div>
    <div className="admin-directory-layout">
      <div className="admin-directory-tree admin-directory-tree-managed">
        <div className="admin-tree-actions"><Button size="small" type="primary" onClick={() => { setSelectedId(null); setEditor(null); setRegionEditor('new'); setDrawnPolygon(null); setFocusPosition(null); }}>新增片区</Button>
          <Button size="small" onClick={() => { setDiscardedOnly(false); setQuickOpen(true); }}>快速操作</Button></div>
        <div className="admin-tree-scroll" ref={treeScrollRef} onScroll={updateFirstVisible}>
          {!!ancestors.length && <div className="admin-tree-path">{ancestors.map((title, index) => <span key={ancestorKeys[index]}>
            {index > 0 && ' › '}<button type="button" onClick={() => {
              const key = ancestorKeys[index];
              const node = [...(treeScrollRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]
                .find((item) => item.id.endsWith('-' + key));
              node?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }}>{title}</button></span>)}</div>}
          <Tree blockNode treeData={treeData} expandedKeys={expandedKeys} onExpand={(keys) => setExpandedKeys(keys)}
            selectedKeys={selectedId ? ['community:' + selectedId] : selectedRegionId ? ['region:' + selectedRegionId] : []}
            onSelect={(keys) => {
              const key = String(keys[0] ?? '');
              if (key.startsWith('region:')) { setSelectedRegionId(key.slice(7)); setSelectedId(null); setFocusPosition(null); }
              else if (key.startsWith('community:')) { const item = communities.find((community) => community.id === key.slice(10)); if (item) chooseCommunity(item); }
              else if (['building', 'unit', 'floor', 'room'].some((kind) => key.startsWith(kind + ':'))) {
                const item = communities.find((community) => community.id === key.split(':')[1]);
                if (item) chooseCommunity(item);
              }
              else if (key === 'discarded') { setSelectedId(null); setSelectedRegionId(null); setFocusPosition(null); setDiscardedOnly(true); setQuickOpen(true); }
            }} />
        </div>
      </div>
      <div className={editor === 'new' || regionEditor ? 'admin-directory-content admin-directory-content-editing' : 'admin-directory-content'}>
        <div className="admin-community-map"><MapView regions={regions} communities={communities.filter((item) => item.regionId !== null)}
          amenities={amenities} summaries={{}} selectedRegionId={selectedRegionId} onRegionSelect={(id) => { setSelectedRegionId(id); setSelectedId(null); setFocusPosition(null); }}
          onCommunitySelect={chooseCommunity} overviewBoundary={boundary} manualBoundaryMode focusPosition={focusPosition}
          onMapClick={editor ? (position) => setFocusPosition(position) : undefined}
          onPolygonDraw={regionEditor ? (polygon) => setDrawnPolygon(polygon) : undefined}
          drawLabel="绘制片区边界" /></div>
        {editor === 'new' && <div className="admin-work-panel"><div className="admin-panel-title"><h3>新增小区</h3><Button onClick={() => setEditor(null)}>关闭</Button></div>
          <CommunityEditor regions={regions} amenities={amenities} actualBuildingCount={0} initialRegionId={selectedRegionId}
            mapPosition={focusPosition} onSaved={async () => { await reload(); setEditor(null); }} onCancel={() => setEditor(null)} /></div>}
        {regionEditor && <RegionEditor open region={regionEditor === 'new' ? undefined : regionEditor} polygon={drawnPolygon}
          onClose={() => setRegionEditor(null)} onSaved={reload} />}
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
        <p>小区简介：{selected.description || '暂无'}</p>
        <div className="community-image-previews">{selected.mainMediaId && <Image src={`/api/media/${selected.mainMediaId}`} width={180} />}
          {selected.detailMediaIds.map((id) => <Image key={id} src={`/api/media/${id}`} width={130} />)}</div>
        <p>关联设施：{amenities.filter((item) => item.communityIds.includes(selected.id)).map((item) => item.name).join('、') || '暂无'}</p>
      </div>}
    </Modal>
    <Modal open={editor !== null && editor !== 'new'} title="小区详情 · 编辑" onCancel={() => setEditor(null)} footer={null} width={760} destroyOnHidden>
      {editor && editor !== 'new' && <CommunityEditor community={editor} regions={regions} amenities={amenities}
        actualBuildingCount={structures[editor.id]?.length ?? 0} initialRegionId={selectedRegionId} mapPosition={focusPosition}
        onSaved={async () => { await reload(); setEditor(null); }} onCancel={() => setEditor(null)} />}
    </Modal>
    <CommunityQuickActions open={quickOpen} onClose={() => setQuickOpen(false)} communities={communities} regions={regions} amenities={amenities} discardedOnly={discardedOnly}
      reload={reload} onEdit={(item) => { setQuickOpen(false); chooseCommunity(item); setEditor(item); }} />
  </div>;
}
