import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Switch, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { api, type Amenity, type Community, type Place, type Region } from '../api';
import { PlaceSearch } from './PlaceSearch';

type Values = Omit<Community, 'id' | 'deliveryDate'> & { deliveryDate: dayjs.Dayjs; amenityIds: string[] };
export function CommunityEditor({ community, regions, amenities, actualBuildingCount, onSaved, initialRegionId, onCancel, mapPosition }: {
  community?: Community; regions: Region[]; amenities: Amenity[]; actualBuildingCount: number;
  onSaved: () => Promise<void>; initialRegionId?: string | null; onCancel: () => void; mapPosition?: [number, number] | null;
}) {
  const [form] = Form.useForm<Values>();
  const [messageApi, holder] = message.useMessage();
  const regionId = Form.useWatch('regionId', form) as string | undefined;
  useEffect(() => {
    form.setFieldsValue(community ? { ...community, regionId: community.regionId ?? undefined,
      deliveryDate: dayjs(community.deliveryDate), amenityIds: amenities.filter((item) => item.communityIds.includes(community.id)).map((item) => item.id) }
      : { name: '', address: '', buildingCount: 0, referenceSalePrice: null,
        isHot: false, visible: true, summary: '', amenityIds: [] });
  }, [community, amenities, form]);
  useEffect(() => { if (!community) form.setFieldValue('regionId', initialRegionId ?? undefined); }, [community, initialRegionId, form]);
  useEffect(() => { if (mapPosition) form.setFieldsValue({ longitude: mapPosition[0], latitude: mapPosition[1] }); }, [mapPosition, form]);
  async function submit(values: Values) {
    try {
      const input = { regionId: values.regionId ?? null, name: values.name, address: values.address,
        longitude: values.longitude, latitude: values.latitude, deliveryDate: values.deliveryDate.format('YYYY-MM-DD'),
        summary: values.summary ?? '', buildingCount: values.buildingCount, referenceSalePrice: values.referenceSalePrice ?? null,
        isHot: Boolean(values.isHot && values.regionId), visible: values.visible !== false, amenityIds: values.amenityIds ?? [] };
      if (community) await api.updateCommunity(community.id, input);
      else await api.addCommunity(input);
      await onSaved();
      messageApi.success('小区资料已保存');
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '保存失败'); }
  }
  function choosePlace(place: Place) {
    form.setFieldsValue({ name: form.getFieldValue('name') || place.name, address: place.address || place.name,
      longitude: place.longitude, latitude: place.latitude });
  }
  return <>{holder}<Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
    <div className="form-row"><Form.Item label="所属片区" name="regionId" extra="不选片区时进入废弃小区站">
      <Select allowClear options={regions.map((region) => ({ value: region.id, label: region.name }))} /></Form.Item>
      <Form.Item label="热门小区" name="isHot" valuePropName="checked"><Switch disabled={!regionId} /></Form.Item></div>
    <PlaceSearch regionId={regionId} onSelect={choosePlace} />
    <div className="form-row"><Form.Item label="小区名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="交付日期" name="deliveryDate" rules={[{ required: true }]}><DatePicker className="full-width" /></Form.Item></div>
    <Form.Item label="地址" name="address" rules={[{ required: true }]}><Input /></Form.Item>
    <div className="form-row"><Form.Item label="经度" name="longitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item>
      <Form.Item label="纬度" name="latitude" rules={[{ required: true }]}><InputNumber precision={6} className="full-width" /></Form.Item></div>
    <div className="form-row"><Form.Item label="规划楼幢数" name="buildingCount" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" /></Form.Item>
      <Form.Item label="参考出售均价（元/㎡）" name="referenceSalePrice"><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item></div>
    <Typography.Text type="secondary">已录入 {actualBuildingCount} 幢；挂牌均价按房源自动计算。</Typography.Text>
    <Form.Item label="配套摘要" name="summary"><Input.TextArea rows={2} /></Form.Item>
    <Form.Item label="关联周边设施" name="amenityIds"><Select mode="multiple" options={amenities.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
    <Form.Item label="展示小区" name="visible" valuePropName="checked"><Switch /></Form.Item>
    <Space><Button type="primary" htmlType="submit">保存小区资料</Button><Button onClick={onCancel}>取消</Button></Space>
  </Form></>;
}
