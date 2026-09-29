import { Button, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Typography, message } from 'antd';
import { useState } from 'react';
import { api, type Amenity, type AmenityType, type Community, type Position, type Region } from '../api';
import { MapView } from '../MapView';
import { PlaceSearch } from './PlaceSearch';

export function FacilitiesPage({ amenities, types, communities, regions, boundary, reload }: {
  amenities: Amenity[]; types: AmenityType[]; communities: Community[]; regions: Region[]; boundary: Position[] | null; reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [focusPosition, setFocusPosition] = useState<Position | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const searchRegionId = Form.useWatch('searchRegionId', form) as string | undefined;
  function open(amenity?: Amenity) {
    setEditing(amenity ?? null); setFormOpen(true);
    if (amenity) setFocusPosition([amenity.longitude, amenity.latitude]);
    form.setFieldsValue(amenity ? { ...amenity, searchRegionId: undefined } : { type: undefined, communityIds: [], searchRegionId: undefined,
      name: '', address: '', longitude: undefined, latitude: undefined, note: '' });
  }
  async function save(values: { type: string; name: string; address: string; longitude: number; latitude: number; note?: string; communityIds?: string[] }) {
    try {
      const input = { ...values, communityIds: values.communityIds ?? [] };
      if (editing) await api.updateAmenity(editing.id, input); else await api.addAmenity(input);
      await reload(); setFormOpen(false); messageApi.success('设施已保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '设施保存失败'); }
  }
  return <div className="admin-page">{contextHolder}<div className="admin-page-heading"><div><h2>周边设施</h2>
    <Typography.Text type="secondary">设施无需归属片区；可关联多个小区。颜色由类型字典统一决定。</Typography.Text></div>
    <Button type="primary" onClick={() => open()}>新增设施</Button></div>
    <div className="admin-facility-layout"><div className="admin-facility-map"><MapView regions={regions} communities={communities.filter((item) => item.regionId !== null)}
      amenities={amenities} summaries={{}} selectedRegionId={null} onRegionSelect={() => {}} onCommunitySelect={() => {}}
      onAmenitySelect={open} onMapClick={formOpen ? (position) => form.setFieldsValue({ longitude: position[0], latitude: position[1] }) : undefined}
      focusPosition={focusPosition} overviewBoundary={boundary} manualBoundaryMode /></div>
      <div className="admin-facility-content"><div className="admin-work-panel"><Table rowKey="id" dataSource={amenities} onRow={(row) => ({ onClick: () => setFocusPosition([row.longitude, row.latitude]) })} columns={[
      { title: '设施', dataIndex: 'name' },
      { title: '类型', render: (_, row) => <span><i className="region-dot" style={{ '--region-color': row.color } as React.CSSProperties} />{row.typeLabel}</span> },
      { title: '关联小区', render: (_, row) => row.communityIds.map((id: string) => communities.find((item) => item.id === id)?.name ?? '已删除小区').join('、') || '暂无' },
      { title: '操作', render: (_, row) => <Space><Button size="small" onClick={() => open(row)}>编辑</Button>
        <Popconfirm title="删除该设施？" onConfirm={() => void api.deleteAmenity(row.id).then(reload).catch((cause) => messageApi.error(String(cause)))}><Button size="small" danger>删除</Button></Popconfirm></Space> },
    ]} /></div>
      {formOpen && <div className="admin-work-panel"><div className="admin-panel-title"><h3>{editing ? '编辑设施' : '新增设施'}</h3><Button type="text" onClick={() => setFormOpen(false)}>关闭</Button></div>
        <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
          <Form.Item label="搜索范围（可选）" name="searchRegionId" extra="只用于缩小地点搜索范围，不绑定设施"><Select allowClear options={regions.map((region) => ({ value: region.id, label: region.name }))} /></Form.Item>
          <PlaceSearch regionId={searchRegionId} onSelect={(place) => form.setFieldsValue({ name: form.getFieldValue('name') || place.name,
            address: place.address || place.name, longitude: place.longitude, latitude: place.latitude })} />
          <Form.Item label="设施类型" name="type" rules={[{ required: true }]}><Select options={types.map((type) => ({ value: type.code, label: type.label }))} /></Form.Item>
          <Form.Item label="关联小区" name="communityIds"><Select mode="multiple" options={communities.filter((item) => item.regionId !== null).map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="地址" name="address" rules={[{ required: true }]}><Input /></Form.Item>
          <div className="form-row"><Form.Item label="经度" name="longitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item>
            <Form.Item label="纬度" name="latitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item></div>
          <Form.Item label="备注" name="note"><Input.TextArea rows={2} /></Form.Item><Button type="primary" htmlType="submit">保存设施</Button>
        </Form></div>}</div>
    </div>
  </div>;
}
