import { AutoComplete, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api, type Building, type Listing } from '../api';

type Values = {
  buildingNumber: string; unitNumber: string; totalFloors: number; floor: number; roomNumber: string;
  type: 'sale' | 'rent' | 'both'; salePrice?: number; rentPrice?: number; area: number;
  bedrooms: number; livingRooms: number; bathrooms: number; decoration: string;
  status: 'draft' | 'listed'; isDefault?: boolean; isGoodPrice?: boolean; isUrgentSale?: boolean;
};

export function UnifiedHomeForm({ communityId, communityName, onChange }: {
  communityId: string; communityName: string; onChange: () => Promise<void>;
}) {
  const [structure, setStructure] = useState<Building[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [mainImage, setMainImage] = useState<File>();
  const [floorplanImage, setFloorplanImage] = useState<File>();
  const [detailImages, setDetailImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [form] = Form.useForm<Values>();
  const type = Form.useWatch('type', form);
  const buildingNumber = Form.useWatch('buildingNumber', form);
  const [messageApi, contextHolder] = message.useMessage();
  useEffect(() => {
    let active = true;
    void Promise.all([api.structure(communityId), api.adminListings(communityId)]).then(([buildings, rows]) => {
      if (active) { setStructure(buildings); setListings(rows); }
    }).catch((cause) => { if (active) messageApi.error(String(cause)); });
    return () => { active = false; };
  }, [communityId, messageApi]);
  const selectedBuilding = useMemo(() => structure.find((item) => item.number === buildingNumber), [structure, buildingNumber]);
  async function save(values: Values) {
    if (!mainImage) { messageApi.error('请先选择主图'); return; }
    setSaving(true);
    try {
      await api.saveHome({ ...values, communityId }, { main: mainImage, floorplan: floorplanImage, details: detailImages });
      const [buildings, rows] = await Promise.all([api.structure(communityId), api.adminListings(communityId)]);
      setStructure(buildings); setListings(rows); await onChange();
      form.resetFields(); setMainImage(undefined); setFloorplanImage(undefined); setDetailImages([]);
      setFileInputVersion((version) => version + 1);
      messageApi.success('房屋与挂牌信息已一起保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setSaving(false); }
  }
  return <div className="property-forms">{contextHolder}<div className="property-forms-heading"><h3>{communityName} · 房屋信息</h3>
    <Typography.Text type="secondary">填写房间位置、出售／租赁信息和图片，点击一次保存。</Typography.Text></div>
    <Card className="form-card listing-form-card"><Form<Values> form={form} layout="vertical" initialValues={{ type: 'sale', status: 'listed', bedrooms: 2,
      livingRooms: 1, bathrooms: 1, decoration: '精装', isDefault: false, isGoodPrice: false, isUrgentSale: false }} onFinish={(values) => void save(values)}>
      <div className="form-row"><Form.Item label="几幢" name="buildingNumber" rules={[{ required: true }]}><AutoComplete options={structure.map((item) => ({ value: item.number }))}
        onSelect={(value) => { const building = structure.find((item) => item.number === value); if (building) form.setFieldValue('totalFloors', building.totalFloors); }}><Input placeholder="例如：1" /></AutoComplete></Form.Item>
        <Form.Item label="几单元" name="unitNumber" rules={[{ required: true }]}><AutoComplete options={(selectedBuilding?.units ?? []).map((item) => ({ value: item.number }))}><Input placeholder="例如：2" /></AutoComplete></Form.Item></div>
      <div className="form-row"><Form.Item label="总楼层" name="totalFloors" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
        <Form.Item label="房屋所在楼层" name="floor" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
        <Form.Item label="室号" name="roomNumber" rules={[{ required: true }]}><Input placeholder="例如：302" /></Form.Item></div>
      <div className="form-row"><Form.Item label="类型" name="type" rules={[{ required: true }]}><Select options={[
        { value: 'sale', label: '出售' }, { value: 'rent', label: '租赁' }, { value: 'both', label: '出售且租赁' },
      ]} /></Form.Item><Form.Item label="状态" name="status" rules={[{ required: true }]}><Select options={[{ value: 'listed', label: '挂牌' }, { value: 'draft', label: '草稿' }]} /></Form.Item></div>
      <div className="form-row">{type !== 'rent' && <Form.Item label="售价（万元）" name="salePrice" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>}
        {type !== 'sale' && <Form.Item label="月租金（元/月）" name="rentPrice" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>}
        <Form.Item label="面积（㎡）" name="area" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item></div>
      <div className="form-row"><Form.Item label="几室" name="bedrooms" rules={[{ required: true }]}><InputNumber min={1} precision={0} className="full-width" /></Form.Item>
        <Form.Item label="几厅" name="livingRooms" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item>
        <Form.Item label="几卫" name="bathrooms" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item></div>
      <div className="form-row"><Form.Item label="装修状况" name="decoration" rules={[{ required: true }]}><Select options={
        ['毛坯', '简装', '精装', '豪华装修'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="设为该楼幢默认展示房间" name="isDefault" valuePropName="checked"><Switch /></Form.Item></div>
      <div className="form-row"><Form.Item label="好价" name="isGoodPrice" valuePropName="checked"><Switch /></Form.Item>
        {type !== 'rent' && <Form.Item label="急售" name="isUrgentSale" valuePropName="checked"><Switch /></Form.Item>}</div>
      <div className="image-inputs"><label>主图（必填）<input key={`main-${fileInputVersion}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMainImage(event.target.files?.[0])} />{mainImage && <span>{mainImage.name}</span>}</label>
        <label>户型图（可选）<input key={`floorplan-${fileInputVersion}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFloorplanImage(event.target.files?.[0])} />{floorplanImage && <span>{floorplanImage.name}</span>}</label>
        <label>详情图（最多 6 张）<input key={`details-${fileInputVersion}`} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          const files = Array.from(event.target.files ?? []); if (files.length > 6) { messageApi.error('最多选择 6 张详情图'); return; } setDetailImages(files);
        }} />{detailImages.length > 0 && <span>{detailImages.length} 张</span>}</label></div>
      <Button type="primary" htmlType="submit" loading={saving}>一次保存房屋信息</Button>
    </Form></Card>
    <Card title="已录入挂牌" className="form-card"><div className="active-listings">{listings.length === 0 ? <Typography.Text type="secondary">暂无房源</Typography.Text> : listings.map((listing) =>
      <div className="active-listing" key={listing.id}><span>{listing.buildingNumber} 幢 {listing.unitNumber} 单元 {listing.roomNumber} 室 ·
        {listing.type === 'sale' ? `${listing.price} 万元` : `${listing.price} 元/月`} · {listing.bedrooms}室{listing.livingRooms}厅{listing.bathrooms}卫 ·
        {listing.status === 'listed' ? '挂牌' : listing.status === 'draft' ? '草稿' : '下架'}</span>
        <Space><Button size="small" onClick={() => void api.setListingStatus(listing.id, listing.status === 'listed' ? 'offline' : 'listed')
          .then(async () => { setListings(await api.adminListings(communityId)); await onChange(); })}>{listing.status === 'listed' ? '下架' : '挂牌'}</Button></Space></div>)}</div></Card>
  </div>;
}
