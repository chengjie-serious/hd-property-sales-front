import { Button, Form, Input, InputNumber, Select, Space, Switch, message } from 'antd';
import { useState } from 'react';
import { api, type Listing } from '../api';

type Values = Pick<Listing, 'buildingNumber' | 'unitNumber' | 'totalFloors' | 'floor' | 'roomNumber' | 'status' | 'price' |
  'area' | 'bedrooms' | 'livingRooms' | 'bathrooms' | 'decoration' | 'isGoodPrice' | 'isUrgentSale'> & { isDefault: boolean };
export function ListingEditor({ listing, onSaved }: { listing: Listing; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<Values>();
  const [main, setMain] = useState<File>();
  const [floorplan, setFloorplan] = useState<File>();
  const [details, setDetails] = useState<File[]>();
  const [retainedDetails, setRetainedDetails] = useState<string[]>(listing.detailMediaIds);
  const [keepFloorplan, setKeepFloorplan] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageApi, holder] = message.useMessage();
  async function save(values: Values) {
    setSaving(true);
    try {
      if (!main && !listing.mainMediaId) throw new Error('主图必填');
      await api.updateHome(listing.id, { ...values, isGoodPrice: Boolean(values.isGoodPrice),
        isUrgentSale: listing.type === 'sale' && Boolean(values.isUrgentSale), isDefault: Boolean(values.isDefault),
        mainMediaId: listing.mainMediaId, floorplanMediaId: keepFloorplan ? listing.floorplanMediaId : null,
        detailMediaIds: retainedDetails }, { main, floorplan, details });
      await onSaved();
      messageApi.success('房屋信息已保存');
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '保存失败'); }
    finally { setSaving(false); }
  }
  return <>{holder}<Form form={form} layout="vertical" initialValues={{ ...listing, isDefault: listing.defaultRoomId === listing.roomId }}
    onFinish={(values) => void save(values)}>
    <div className="form-row"><Form.Item label="几幢" name="buildingNumber" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="几单元" name="unitNumber" rules={[{ required: true }]}><Input /></Form.Item></div>
    <div className="form-row"><Form.Item label="总楼层" name="totalFloors" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
      <Form.Item label="房屋所在楼层" name="floor" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
      <Form.Item label="室号" name="roomNumber" rules={[{ required: true }]}><Input /></Form.Item></div>
    <div className="form-row"><Form.Item label="类型"><Input value={listing.type === 'sale' ? '出售' : '租赁'} disabled /></Form.Item>
      <Form.Item label="状态" name="status" rules={[{ required: true }]}><Select options={[
        { value: 'listed', label: '挂牌' }, { value: 'offline', label: '下架' }, { value: 'draft', label: '草稿' },
      ]} /></Form.Item></div>
    <div className="form-row"><Form.Item label={listing.type === 'sale' ? '售价（万元）' : '租金（元/月）'} name="price" rules={[{ required: true }]}>
      <InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>
      <Form.Item label="面积（㎡）" name="area" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item></div>
    <div className="form-row"><Form.Item label="几室" name="bedrooms" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
      <Form.Item label="几厅" name="livingRooms" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item>
      <Form.Item label="几卫" name="bathrooms" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item></div>
    <div className="form-row"><Form.Item label="装修状况" name="decoration" rules={[{ required: true }]}><Select options={
      ['毛坯', '简装', '精装', '豪华装修'].map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item label="该楼幢默认展示房间" name="isDefault" valuePropName="checked"><Switch /></Form.Item></div>
    <Space><Form.Item label="好价" name="isGoodPrice" valuePropName="checked"><Switch /></Form.Item>
      {listing.type === 'sale' && <Form.Item label="急售" name="isUrgentSale" valuePropName="checked"><Switch /></Form.Item>}</Space>
    <div className="image-inputs">
      <div><label>主图（必填）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMain(event.target.files?.[0])} /></label>
        {listing.mainMediaId && <a target="_blank" rel="noreferrer" href={'/api/media/' + listing.mainMediaId}>
          <img className="listing-media-thumb" src={'/api/media/' + listing.mainMediaId} alt="现有主图" /></a>}</div>
      <div><label>户型图（可选）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFloorplan(event.target.files?.[0])} /></label>
        {keepFloorplan && listing.floorplanMediaId && <Space><a target="_blank" rel="noreferrer" href={'/api/media/' + listing.floorplanMediaId}>
          <img className="listing-media-thumb" src={'/api/media/' + listing.floorplanMediaId} alt="现有户型图" /></a>
          <Button size="small" onClick={() => setKeepFloorplan(false)}>移除</Button></Space>}</div>
      <div><label>详情图（最多 6 张）<input type="file" multiple accept="image/jpeg,image/png,image/webp"
        onChange={(event) => { const files = Array.from(event.target.files ?? []); if (retainedDetails.length + files.length > 6) {
          messageApi.error('保留图片与新图片合计最多 6 张'); return; } setDetails(files); }} /></label>
        <div className="listing-media-thumbs">{retainedDetails.map((id) => <div key={id}>
          <a target="_blank" rel="noreferrer" href={'/api/media/' + id}><img className="listing-media-thumb" src={'/api/media/' + id} alt="现有详情图" /></a>
          <Button size="small" onClick={() => setRetainedDetails((ids) => ids.filter((item) => item !== id))}>移除</Button>
        </div>)}</div><span>保留 {retainedDetails.length} 张，新选 {details?.length ?? 0} 张</span></div>
    </div>
    <Button type="primary" htmlType="submit" loading={saving}>一次保存房屋信息</Button>
  </Form></>;
}
