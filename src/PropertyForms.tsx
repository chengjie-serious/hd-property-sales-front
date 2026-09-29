import { Button, Card, Empty, Form, Input, InputNumber, Select, Space, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Building, type Listing } from './api';

type Props = { communityId: string | null; communityName?: string; onChange?: () => Promise<void> };

export function PropertyForms({ communityId, communityName, onChange }: Props) {
  const [structure, setStructure] = useState<Building[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [mainMediaId, setMainMediaId] = useState<string>();
  const [floorplanMediaId, setFloorplanMediaId] = useState<string>();
  const [detailMediaIds, setDetailMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [defaultForm] = Form.useForm();
  const [listingForm] = Form.useForm();
  const selectedDefaultBuildingId = Form.useWatch('buildingId', defaultForm);
  const [messageApi, contextHolder] = message.useMessage();

  const reload = useCallback(async () => {
    if (!communityId) { setStructure([]); setListings([]); return; }
    const [nextStructure, nextListings] = await Promise.all([api.structure(communityId), api.adminListings(communityId)]);
    setStructure(nextStructure);
    setListings(nextListings);
  }, [communityId]);
  useEffect(() => { void reload().catch((error) => messageApi.error(String(error))); }, [reload, messageApi]);

  const units = useMemo(() => structure.flatMap((building) => building.units.map((unit) => ({ ...unit, buildingNumber: building.number }))), [structure]);
  const rooms = useMemo(() => units.flatMap((unit) => unit.rooms.map((room) => ({ ...room, buildingNumber: unit.buildingNumber, unitNumber: unit.number }))), [units]);
  const defaultBuildingRooms = rooms.filter((room) => structure.find((building) => building.id === selectedDefaultBuildingId)?.units.some((unit) => unit.id === room.unitId));

  async function save(action: () => Promise<unknown>, success: string) {
    try { await action(); await reload(); await onChange?.(); messageApi.success(success); }
    catch (error) { messageApi.error(error instanceof Error ? error.message : '保存失败'); }
  }

  async function upload(file: File, setId: (id: string) => void) {
    setUploading(true);
    try { const result = await api.uploadMedia(file); setId(result.id); messageApi.success('图片已上传'); }
    catch (error) { messageApi.error(error instanceof Error ? error.message : '图片上传失败'); }
    finally { setUploading(false); }
  }

  if (!communityId) return <Card className="form-card"><Empty description="先从左侧片区列表选择并打开一个小区，再维护楼栋与房源" /></Card>;

  return <div className="property-forms">
    {contextHolder}
    <div className="property-forms-heading"><h3>{communityName} · 房间与挂牌管理</h3><Typography.Text type="secondary">依次录入楼栋、单元、房间，再上传主图并挂牌。</Typography.Text></div>
    <div className="admin-panels">
      <Card title="新增楼栋" className="form-card"><Form layout="vertical" onFinish={(values) => void save(() => api.addBuilding({ ...values, communityId }), '楼栋已保存')}>
        <Form.Item label="楼栋编号" name="number" rules={[{ required: true }]}><Input placeholder="例如：1" /></Form.Item>
        <Form.Item label="总楼层" name="totalFloors" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
        <Button htmlType="submit" type="primary">保存楼栋</Button>
      </Form></Card>
      <Card title="新增单元" className="form-card"><Form layout="vertical" onFinish={(values) => void save(() => api.addUnit(values), '单元已保存')}>
        <Form.Item label="所属楼栋" name="buildingId" rules={[{ required: true }]}><Select options={structure.map((b) => ({ value: b.id, label: `${b.number} 幢` }))} /></Form.Item>
        <Form.Item label="单元编号" name="number" rules={[{ required: true }]}><Input placeholder="例如：1" /></Form.Item>
        <Button htmlType="submit" type="primary">保存单元</Button>
      </Form></Card>
      <Card title="新增房间" className="form-card"><Form layout="vertical" onFinish={(values) => void save(() => api.addRoom(values), '房间已保存')}>
        <Form.Item label="所属单元" name="unitId" rules={[{ required: true }]}><Select options={units.map((u) => ({ value: u.id, label: `${u.buildingNumber} 幢 / ${u.number} 单元` }))} /></Form.Item>
        <div className="form-row">
          <Form.Item label="楼层" name="floor" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
          <Form.Item label="室号" name="number" rules={[{ required: true }]}><Input placeholder="例如：301" /></Form.Item>
        </div>
        <Button htmlType="submit" type="primary">保存房间</Button>
      </Form></Card>
      <Card title="默认展示房间" className="form-card"><Form form={defaultForm} layout="vertical" onFinish={(values) => void save(() => api.setDefaultRoom(values.buildingId, values.roomId), '默认房间已设置')}>
        <Form.Item label="楼栋" name="buildingId" rules={[{ required: true }]}><Select onChange={() => defaultForm.setFieldValue('roomId', undefined)} options={structure.map((b) => ({ value: b.id, label: `${b.number} 幢` }))} /></Form.Item>
        <Form.Item label="房间" name="roomId" rules={[{ required: true }]}><Select options={defaultBuildingRooms.map((r) => ({ value: r.id, label: `${r.unitNumber} 单元 / ${r.floor} 层 / ${r.number} 室` }))} /></Form.Item>
        <Button htmlType="submit" type="primary">设为默认</Button>
      </Form></Card>
    </div>
    <Card title="新增售房或租房挂牌" className="form-card listing-form-card">
      <Form form={listingForm} layout="vertical" initialValues={{ type: 'sale', status: 'listed', bedrooms: 2, livingRooms: 1, decoration: '精装' }} onFinish={(values) => void save(async () => {
        await api.addListing({ ...values, mainMediaId, floorplanMediaId, detailMediaIds });
        listingForm.resetFields(); setMainMediaId(undefined); setFloorplanMediaId(undefined); setDetailMediaIds([]);
      }, '房源已保存')}>
        <div className="form-row">
          <Form.Item label="房间" name="roomId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={rooms.map((r) => ({ value: r.id, label: `${r.buildingNumber} 幢 / ${r.unitNumber} 单元 / ${r.floor} 层 / ${r.number} 室` }))} /></Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true }]}><Select options={[{ value: 'sale', label: '售房' }, { value: 'rent', label: '租房' }]} /></Form.Item>
        </div>
        <div className="form-row">
          <Form.Item label="价格（售房：万元；租房：元/月）" name="price" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>
          <Form.Item label="面积（㎡）" name="area" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>
        </div>
        <div className="form-row">
          <Form.Item label="几室" name="bedrooms" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
          <Form.Item label="几厅" name="livingRooms" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item>
        </div>
        <Form.Item label="装修情况" name="decoration"><Select options={['毛坯', '简装', '精装', '豪华装修'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="状态" name="status"><Select options={[{ value: 'listed', label: '挂牌' }, { value: 'draft', label: '草稿' }]} /></Form.Item>
        <div className="image-inputs">
          <label>主图（挂牌必填）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, setMainMediaId); }} />{mainMediaId && <span>已上传</span>}</label>
          <label>户型图（可选）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, setFloorplanMediaId); }} />{floorplanMediaId && <span>已上传</span>}</label>
          <label>详情图（最多 6 张）<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const files = Array.from(event.target.files ?? []).slice(0, 6 - detailMediaIds.length);
            void Promise.all(files.map((file) => api.uploadMedia(file))).then((items) => setDetailMediaIds((ids) => [...ids, ...items.map((item) => item.id)])).catch((error) => messageApi.error(String(error)));
          }} />{detailMediaIds.length > 0 && <span>已上传 {detailMediaIds.length} 张</span>}</label>
        </div>
        <Button htmlType="submit" type="primary" disabled={uploading}>保存房源</Button>
      </Form>
      <div className="active-listings"><h4>已录入房源</h4>{listings.length === 0 ? <Typography.Text type="secondary">暂无房源</Typography.Text> : listings.map((listing) =>
        <div className="active-listing" key={listing.id}><span>{listing.buildingNumber} 幢 {listing.unitNumber} 单元 {listing.roomNumber} 室 · {listing.type === 'sale' ? `${listing.price} 万元` : `${listing.price} 元/月`} · {listing.status === 'listed' ? '挂牌' : listing.status === 'draft' ? '草稿' : '下架'}</span>
          <Space>{listing.status === 'listed' ?
            <Button size="small" danger onClick={() => void save(() => api.setListingStatus(listing.id, 'offline'), '房源已下架')}>下架</Button> :
            <Button size="small" onClick={() => void save(() => api.setListingStatus(listing.id, 'listed'), '房源已挂牌')}>挂牌</Button>}</Space></div>)}</div>
    </Card>
  </div>;
}
