import { AMAP_JS_API_KEY } from './map-key.local';

/** 高德 JS API Key 唯一读取入口；实际值在被 Git 忽略的 map-key.local.ts。 */
export const MAP_CONFIG = {
  jsApiKey: AMAP_JS_API_KEY,
  version: '2.0',
  initialCenter: [120.3003, 29.1548] as [number, number],
} as const;

export const mapKeyConfigured =
  MAP_CONFIG.jsApiKey.length > 0 && !MAP_CONFIG.jsApiKey.startsWith('REPLACE_WITH_');
