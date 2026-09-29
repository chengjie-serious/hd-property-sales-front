import { Button, Form, Input, Modal, Space, message } from 'antd';
import { useEffect } from 'react';
import { api, type Position, type Region } from '../api';

type Values = { name: string; color: string; polygon: string };
export function RegionEditor({ open, region, polygon, onClose, onSaved }: {
  open: boolean; region?: Region; polygon?: Position[] | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form] = Form.useForm<Values>();
  const [messageApi, holder] = message.useMessage();
  useEffect(() => {
    if (open) form.setFieldsValue(region ? { name: region.name, color: region.color, polygon: JSON.stringify(region.polygon) }
      : { name: '', color: '#1677ff', polygon: '' });
  }, [open, region, form]);
  useEffect(() => { if (open && polygon) form.setFieldValue('polygon', JSON.stringify(polygon)); }, [open, polygon, form]);
  async function save(values: Values) {
    try {
      const parsed = JSON.parse(values.polygon) as Position[];
      if (region) await api.updateRegion(region.id, { name: values.name, color: values.color, polygon: parsed });
      else await api.addRegion({ name: values.name, color: values.color, polygon: parsed });
      await onSaved(); onClose(); messageApi.success('片区已保存');
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '片区保存失败'); }
  }
  return <Modal open={open} title={region ? '编辑片区' : '新增片区'} onCancel={onClose} footer={null} width={520} mask={false} style={{ marginRight: 24 }}>
    {holder}<Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
      <Form.Item name="name" label="片区名称" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="color" label="片区颜色" rules={[{ required: true }]}><Input type="color" /></Form.Item>
      <Form.Item name="polygon" label="片区边界" rules={[{ required: true }]} extra="在地图绘制区域后自动写入；也可粘贴坐标数组"><Input.TextArea rows={5} /></Form.Item>
      <Space><Button type="primary" htmlType="submit">保存片区</Button><Button onClick={onClose}>取消</Button></Space>
    </Form>
  </Modal>;
}
