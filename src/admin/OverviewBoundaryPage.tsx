import { Button, Popconfirm, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { MapView } from '../MapView';
import { api, type Position, type Region } from '../api';

export function OverviewBoundaryPage({ regions, boundary, reload }: {
  regions: Region[]; boundary: Position[] | null; reload: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Position[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [messageApi, holder] = message.useMessage();

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await api.saveOverviewBoundary(draft);
      await reload();
      setDraft(null);
      messageApi.success('横店轮廓已保存');
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '保存轮廓失败'); }
    finally { setSaving(false); }
  }

  async function clear() {
    setSaving(true);
    try {
      await api.clearOverviewBoundary();
      await reload();
      setDraft(null);
      messageApi.success('横店轮廓已清除');
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '清除轮廓失败'); }
    finally { setSaving(false); }
  }

  return <div className="admin-page admin-communities-page">{holder}
    <div className="admin-page-heading"><div><h2>横店轮廓</h2>
      <Typography.Text type="secondary">绘制并维护横店整体轮廓；地图中的片区仅供查看</Typography.Text></div>
      <Space><Button type="primary" disabled={!draft} loading={saving} onClick={() => void save()}>保存轮廓</Button>
        {draft && <Button onClick={() => setDraft(null)}>放弃本次绘制</Button>}
        <Popconfirm title="清除横店整体轮廓？" description="清除后地图仍展示已录入的片区，可重新绘制轮廓。"
          onConfirm={() => void clear()}><Button danger disabled={!boundary || saving}>清除轮廓</Button></Popconfirm></Space></div>
    <div className="admin-boundary-map"><MapView regions={regions} communities={[]} amenities={[]} summaries={{}}
      selectedRegionId={null} onRegionSelect={() => {}} onCommunitySelect={() => {}}
      overviewBoundary={boundary} draftPolygon={draft} onPolygonDraw={setDraft} drawLabel="绘制横店轮廓" />
    </div>
  </div>;
}
