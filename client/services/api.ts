import type { AppSettings, Config, BrowsersConfig, Profile } from "../types";
import { client } from "../lib/hono-client";

// プロファイル一覧取得
export async function listProfiles(): Promise<string[]> {
  const res = await client.profiles.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch profiles list");
  }
  return res.json();
}

// 特定プロファイル取得
export async function getProfile(
  profileName: string
): Promise<Profile> {
  const res = await client.profiles[":name"].$get({
    param: { name: profileName },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch profile: ${profileName}`);
  }
  return res.json();
}

// 新規プロファイル作成
export async function createProfile(
  name: string,
  copyFrom?: string
): Promise<void> {
  const res = await client.profiles.$post({
    json: { name, copyFrom },
  });
  if (!res.ok) {
    const error = await res.json();
    const errorMsg = "error" in error ? error.error : "Failed to create profile";
    throw new Error(errorMsg);
  }
}

// 表示設定更新
export async function updateDisplaySettings(
  profileName: string,
  settings: AppSettings
): Promise<void> {
  const res = await client.profiles[":name"]["display-settings"].$put({
    param: { name: profileName },
    json: settings,
  });
  if (!res.ok) {
    throw new Error("Failed to update display settings");
  }
}

// 検索エンジン設定更新
export async function updateSearchEngines(
  profileName: string,
  engines: Config
): Promise<void> {
  const res = await client.profiles[":name"]["search-engines"].$put({
    param: { name: profileName },
    json: engines,
  });
  if (!res.ok) {
    throw new Error("Failed to update search engines");
  }
}

// プロファイル削除
export async function deleteProfile(profileName: string): Promise<void> {
  const res = await client.profiles[":name"].$delete({
    param: { name: profileName },
  });
  if (!res.ok) {
    const error = await res.json();
    const errorMsg = "error" in error ? error.error : "Failed to delete profile";
    throw new Error(errorMsg);
  }
}

// プロファイル複製
export async function cloneProfile(
  sourceName: string,
  newName: string
): Promise<void> {
  const res = await client.profiles[":name"].clone.$post({
    param: { name: sourceName },
    json: { newName },
  });
  if (!res.ok) {
    const error = await res.json();
    const errorMsg = "error" in error ? error.error : "Failed to clone profile";
    throw new Error(errorMsg);
  }
}

// プロファイル名変更
export async function renameProfile(
  oldName: string,
  newName: string
): Promise<void> {
  const res = await client.profiles[":name"].rename.$put({
    param: { name: oldName },
    json: { newName },
  });
  if (!res.ok) {
    const error = await res.json();
    const errorMsg = "error" in error ? error.error : "Failed to rename profile";
    throw new Error(errorMsg);
  }
}

// アクティブプロファイル取得
export async function getActiveProfile(): Promise<string> {
  const res = await client.profiles.active.current.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch active profile");
  }
  const data = await res.json();
  return data.profileName;
}

// アクティブプロファイル変更
export async function setActiveProfile(profileName: string): Promise<void> {
  const res = await client.profiles.active.current.$put({
    json: { profileName },
  });
  if (!res.ok) {
    throw new Error("Failed to set active profile");
  }
}

// ブラウザ設定取得
export async function getBrowsersConfig(): Promise<BrowsersConfig> {
  const res = await client.browsers.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch browsers config");
  }
  return res.json();
}

// ブラウザ設定更新
export async function updateBrowsersConfig(config: BrowsersConfig): Promise<void> {
  const res = await client.browsers.$put({
    json: config,
  });
  if (!res.ok) {
    throw new Error("Failed to update browsers config");
  }
}

// 特定のブラウザを起動
export async function launchBrowser(browserName: string): Promise<void> {
  const res = await client.browsers.launch[":browserName"].$post({
    param: { browserName },
  });
  if (!res.ok) {
    throw new Error(`Failed to launch ${browserName}`);
  }
}

// エクスプローラーでフォルダを開く
export async function openFolderInExplorer(folderPath: string): Promise<void> {
  const res = await client.explorer.open.$post({
    json: { folderPath },
  });
  if (!res.ok) {
    throw new Error("Failed to open folder");
  }
}
