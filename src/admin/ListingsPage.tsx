import { Button, Input, Modal, Select, Space, Table, Tabs, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { api, type Community, type Listing, type Region } from '../api';
import { filterListings, type ListingFilter } from '../domain/listing-filter';
import { ListingEditor } from './ListingEditor';
import { UnifiedHomeForm } from './UnifiedHomeForm';

export function ListingsPage({ listings, regions, communities, reload, openCommunity }: {
  listings: Listing[]; regions: Region[]; communities: Community[]; reload: () => Promise<void>; openCommunity: (id: string) => void;
}) {
  const [type, setType] = useState<'sale' | 'rent'>('sale');
  const [query, setQuery] = useState('');
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [floors, setFloors] = useState<number[]>([]);
  const [status, setStatus] = useState<ListingFilter['status']>('all');
  const [goodPrice, setGoodPrice] = useState(false);
  const [urgentSale, setUrgentSale] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [createCommunityId, setCreateCommunityId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [messageApi, holder] = message.useMessage();
  const rows = useMemo(() => filterListings(listings, { type, query, regionIds, communityIds, floors, status, goodPrice, urgentSale }),
    [listings, type, query, regionIds, communityIds, floors, status, goodPrice, urgentSale]);
  const floorOptions = [...new Set(listings.filter((item) => item.type === type).map((item) => item.floor))]
    .sort((a, b) => a - b).map((floor) => ({ value: floor, label: floor + ' 层' }));
  async function changeStatus(listing: Listing, next: 'listed' | 'offline') {
    try { await api.setListingStatus(listing.id, next); await reload(); messageApi.success(next === 'listed' ? '已挂牌' : '已下架'); }
    catch (error) { messageApi.error(error instanceof Error ? error.message : '状态更新失败'); }
  }
  return <div className="admin-page">{holder}
    <div className="admin-page-heading"><div><h2>出售 / 租赁房屋列表</h2>
      <Typography.Text type="secondary">房源位置、价格、户型和图片在同一表单维护</Typography.Text></div>
      <Button type="primary" onClick={() => setCreateOpen(true)}>新增房屋</Button></div>
    <Tabs activeKey={type} onChange={(key) => { setType(key as 'sale' | 'rent'); setUrgentSale(false); }}
      items={[{ key: 'sale', label: '售房' }, { key: 'rent', label: '租赁' }]} />
    <Space wrap className="admin-filter-row">
      <Input.Search placeholder="搜索小区名称" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 210 }} />
      <Select mode="multiple" placeholder="片区筛选" value={regionIds} onChange={setRegionIds} allowClear style={{ minWidth: 170 }}
        options={regions.map((item) => ({ label: item.name, value: item.id }))} />
      <Select mode="multiple" placeholder="小区筛选" value={communityIds} onChange={setCommunityIds} allowClear style={{ minWidth: 190 }}
        options={communities.filter((item) => !regionIds.length || (item.regionId && regionIds.includes(item.regionId)))
          .map((item) => ({ label: item.name, value: item.id }))} />
      <Select mode="multiple" placeholder="楼层筛选" value={floors} onChange={setFloors} allowClear style={{ minWidth: 125 }} options={floorOptions} />
      <Select value={status} onChange={setStatus} style={{ width: 130 }} options={[
        { value: 'all', label: '全部状态' }, { value: 'listed', label: '挂牌' }, { value: 'offline', label: '下架' }, { value: 'draft', label: '草稿' },
      ]} />
      <Select value={goodPrice ? 'yes' : 'all'} onChange={(value) => setGoodPrice(value === 'yes')} style={{ width: 115 }}
        options={[{ value: 'all', label: '全部价格' }, { value: 'yes', label: '好价' }]} />
      {type === 'sale' && <Select value={urgentSale ? 'yes' : 'all'} onChange={(value) => setUrgentSale(value === 'yes')} style={{ width: 110 }}
        options={[{ value: 'all', label: '全部急售' }, { value: 'yes', label: '急售' }]} />}
    </Space>
    <Table rowKey="id" dataSource={rows} scroll={{ x: 1200 }} onRow={(row) => ({ onClick: () => setSelected(row) })}
      columns={[
        { title: '小区', dataIndex: 'communityName', render: (name: string, row) => <Button type="link" onClick={(event) => { event.stopPropagation(); if (row.communityId) openCommunity(row.communityId); }}>{name}</Button> },
        { title: '房间', render: (_, row) => row.buildingNumber + ' 幢 ' + row.unitNumber + ' 单元 ' + row.roomNumber + ' 室' },
        { title: '价格', render: (_, row) => row.price + (row.type === 'sale' ? ' 万元' : ' 元/月') },
        { title: '面积', dataIndex: 'area', render: (value: number) => value + ' ㎡' },
        { title: '楼层', dataIndex: 'floor', render: (value: number, row) => value + ' / ' + row.totalFloors },
        { title: '好价', render: (_, row) => row.isGoodPrice ? '是' : '否' },
        ...(type === 'sale' ? [{ title: '急售', render: (_: unknown, row: Listing) => row.isUrgentSale ? '是' : '否' }] : []),
        { title: '状态', dataIndex: 'status', render: (value: string) => value === 'listed' ? '挂牌' : value === 'draft' ? '草稿' : '下架' },
        { title: '操作', render: (_, row) => <Space><Button size="small" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>编辑</Button>
          <Button size="small" danger={row.status === 'listed'} onClick={(event) => { event.stopPropagation(); void changeStatus(row, row.status === 'listed' ? 'offline' : 'listed'); }}>
            {row.status === 'listed' ? '下架' : '挂牌'}</Button></Space> },
      ]} />
    <Modal open={selected !== null} title={selected ? selected.communityName + ' · 房屋信息' : '房屋信息'}
      onCancel={() => setSelected(null)} footer={null} width={1000} destroyOnHidden>
      {selected && <ListingEditor listing={selected} onSaved={async () => { await reload(); setSelected(null); }} />}
    </Modal>
    <Modal open={createOpen} title="新增出售 / 租赁房屋" onCancel={() => setCreateOpen(false)} footer={null} width={1100} destroyOnHidden>
      <Select showSearch optionFilterProp="label" placeholder="先选择小区" value={createCommunityId} onChange={setCreateCommunityId}
        style={{ width: 300 }} options={communities.filter((item) => item.regionId !== null)
          .map((item) => ({ value: item.id, label: item.name }))} />
      {createCommunityId && <UnifiedHomeForm communityId={createCommunityId}
        communityName={communities.find((item) => item.id === createCommunityId)?.name ?? ''} onChange={reload} />}
    </Modal>
  </div>;
}
