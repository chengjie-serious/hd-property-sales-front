import { Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { api, type Community, type Region } from '../api';

export function CommunityQuickActions({ open, onClose, communities, regions, onEdit, reload }: {
  open: boolean; onClose: () => void; communities: Community[]; regions: Region[];
  onEdit: (community: Community) => void; reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetRegionId, setTargetRegionId] = useState<string>();
  const [messageApi, holder] = message.useMessage();
  const rows = useMemo(() => communities.filter((item) => (item.name + ' ' + item.address).toLowerCase().includes(query.toLowerCase().trim())), [communities, query]);
  async function run(action: () => Promise<unknown>, success: string) {
    try { await action(); await reload(); setSelectedIds([]); messageApi.success(success); }
    catch (error) { messageApi.error(error instanceof Error ? error.message : '操作失败'); }
  }
  return <Modal title="小区列表 · 快速操作" open={open} onCancel={onClose} footer={null} width="min(94vw, 1400px)" destroyOnHidden>
    {holder}<Space wrap className="admin-filter-row">
      <Input.Search placeholder="搜索小区名称或地址" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 260 }} />
      <Select placeholder="目标片区" value={targetRegionId} onChange={setTargetRegionId} style={{ width: 190 }}
        options={regions.map((region) => ({ label: region.name, value: region.id }))} />
      <Button type="primary" disabled={!selectedIds.length || !targetRegionId}
        onClick={() => void run(() => api.assignCommunities(selectedIds, targetRegionId!), '已批量转移')}>批量转移</Button>
      <Popconfirm title="将选中小区移入废弃小区站？" onConfirm={() => void run(() => api.assignCommunities(selectedIds, null), '已批量废弃')}>
        <Button danger disabled={!selectedIds.length}>批量废弃</Button></Popconfirm>
      <span>已选 {selectedIds.length} 个</span>
    </Space>
    <Table rowKey="id" size="small" dataSource={rows} scroll={{ x: 1300, y: '55vh' }}
      rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)) }}
      columns={[
        { title: '小区', dataIndex: 'name', width: 170 },
        { title: '所属片区', width: 125, render: (_, row) => regions.find((item) => item.id === row.regionId)?.name ?? '废弃小区站' },
        { title: '地址', dataIndex: 'address', width: 220, ellipsis: true },
        { title: '交付日期', dataIndex: 'deliveryDate', width: 120 },
        { title: '坐标', width: 190, render: (_, row) => row.longitude + ', ' + row.latitude },
        { title: '规划楼幢', dataIndex: 'buildingCount', width: 95 },
        { title: '参考均价', dataIndex: 'referenceSalePrice', width: 100, render: (value: number | null) => value == null ? '—' : value + ' 元/㎡' },
        { title: '热门', width: 75, render: (_, row) => row.isHot ? <Tag color="red">是</Tag> : '否' },
        { title: '展示', width: 75, render: (_, row) => row.visible ? '是' : '否' },
        { title: '配套摘要', dataIndex: 'summary', width: 160, ellipsis: true },
        { title: '操作', fixed: 'right', width: 150, render: (_, row) => <Space><Button size="small" onClick={() => onEdit(row)}>编辑</Button>
          <Popconfirm title={row.regionId ? '移入废弃小区站？' : '永久删除小区及其房源和图片？'}
            onConfirm={() => void run(() => api.deleteCommunity(row.id), row.regionId ? '已移入废弃站' : '已永久删除')}>
            <Button size="small" danger>删除</Button></Popconfirm></Space> },
      ]} />
  </Modal>;
}
