import { Alert, Input, List } from 'antd';
import { useState } from 'react';
import { api, type Place } from '../api';

export function PlaceSearch({ regionId, onSelect }: { regionId?: string; onSelect: (place: Place) => void }) {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function search() {
    if (!keywords.trim()) return;
    setLoading(true); setError('');
    try { setResults(await api.places(keywords.trim(), regionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '地点搜索失败'); }
    finally { setLoading(false); }
  }
  return <div className="admin-place-search">
    <Input.Search value={keywords} onChange={(event) => setKeywords(event.target.value)} onSearch={() => void search()}
      loading={loading} enterButton="搜索" placeholder={regionId ? '在所选片区搜索地点' : '搜索地点（可不选片区）'} />
    {error && <Alert type="error" showIcon message={error} />}
    {results.length > 0 && <List size="small" bordered dataSource={results} renderItem={(place) =>
      <List.Item className="place-result" onClick={() => { onSelect(place); setResults([]); setKeywords(place.name); }}>
        <strong>{place.name}</strong><span>{place.address}</span>
      </List.Item>} />}
  </div>;
}
