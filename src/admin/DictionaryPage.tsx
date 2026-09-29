import { Button, Form, Input, Popconfirm, Space, Table, Typography, message } from 'antd';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { api, type Amenity, type AmenityType } from '../api';

export function DictionaryPage({ types, amenities, reload }: { types: AmenityType[]; amenities: Amenity[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<AmenityType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  function open(item?: AmenityType) {
    setEditing(item ?? null); setFormOpen(true);
    form.setFieldsValue(item ?? { code: '', label: '', color: '#1677ff' });
  }
  async function save(values: { code: string; label: string; color: string }) {
    try {
      if (editing) await api.updateAmenityType(editing.code, { label: values.label, color: values.color });
      else await api.addAmenityType(values);
      await reload(); setFormOpen(false); messageApi.success('设施类型已保存');
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '保存失败'); }
  }
  return <div className="admin-page">{contextHolder}<div className="admin-page-heading"><div><h2>字典列表</h2>
    <Typography.Text type="secondary">当前维护周边设施类型的名称和颜色。更改颜色会同步到该类型所有设施。</Typography.Text></div>
    <Button type="primary" onClick={() => open()}>新增设施类型</Button></div>
    <div className="admin-split-layout"><div className="admin-work-panel"><Table rowKey="code" dataSource={types} columns={[
      { title: '类型名称', render: (_, item) => <span><i className="region-dot" style={{ '--region-color': item.color } as CSSProperties} />{item.label}</span> },
      { title: '编码', dataIndex: 'code' }, { title: '颜色', dataIndex: 'color' },
      { title: '设施数', render: (_, item) => amenities.filter((amenity) => amenity.type === item.code).length },
      { title: '操作', render: (_, item) => <Space><Button size="small" onClick={() => open(item)}>编辑</Button>
        <Popconfirm title="删除该类型？已有设施使用时无法删除" onConfirm={() => void api.deleteAmenityType(item.code).then(reload).then(() => messageApi.success('已删除')).catch((cause) => messageApi.error(String(cause)))}><Button size="small" danger>删除</Button></Popconfirm></Space> },
    ]} /></div>
      {formOpen && <div className="admin-work-panel"><div className="admin-panel-title"><h3>{editing ? '编辑设施类型' : '新增设施类型'}</h3><Button type="text" onClick={() => setFormOpen(false)}>关闭</Button></div>
        <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
          <Form.Item label="类型编码" name="code" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]{1,39}$/, message: '使用小写英文、数字和下划线' }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item label="类型名称" name="label" rules={[{ required: true }]}><Input placeholder="例如：医院" /></Form.Item>
          <Form.Item label="地图标记颜色" name="color" rules={[{ required: true }]}><Input type="color" /></Form.Item>
          <Button type="primary" htmlType="submit">保存类型</Button>
        </Form></div>}
    </div>
  </div>;
}
