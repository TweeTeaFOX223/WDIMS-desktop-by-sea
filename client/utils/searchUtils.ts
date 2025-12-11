import type { Config, TabConfig } from '../types';

/**
 * 検索クエリをURLエンコードして検索URLを生成
 */
export function generateSearchUrl(template: string, query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return template.replace('{query}', encodedQuery);
}

/**
 * タブIDから該当するタブ設定を取得
 */
export function getTabById(config: Config, tabId: string): TabConfig | undefined {
  return config.tabs.find(tab => tab.id === tabId);
}
