import { promises as fs } from 'fs';
import path from 'path';
import type { DisplaySettings, SearchEnginesConfig, Profile } from '../types/index.js';

// SEA環境では、実行ファイルのディレクトリを基準にする
// process.cwd()は実行時のカレントディレクトリを返す
const BASE_DIR = process.cwd();

const PROFILES_DIR = path.join(BASE_DIR, 'config/profiles');
const ACTIVE_PROFILE_FILE = path.join(BASE_DIR, 'config/active-profile.txt');

// プロファイル名のバリデーション
function validateProfileName(name: string): boolean {
  // 空文字チェック
  if (!name || name.trim().length === 0) {
    throw new Error('Profile name cannot be empty');
  }

  // パストラバーサル攻撃の防止
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid profile name: path traversal detected');
  }

  // Windowsで使用できないファイル名文字をチェック
  const invalidChars = /[<>:"|?*\x00-\x1F]/;
  if (invalidChars.test(name)) {
    throw new Error('Profile name contains invalid characters');
  }

  // Windows予約名のチェック
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(name.toUpperCase())) {
    throw new Error('Profile name is a reserved Windows name');
  }

  return true;
}

// プロファイル一覧取得
export async function listProfiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PROFILES_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    console.error('Failed to list profiles:', error);
    return ['default'];
  }
}

// プロファイル設定ファイルのパス取得（書き込み用）
function getSettingsFilePath(profileDir: string, fileType: 'ui' | 'engine', profileName: string): string {
  const extension = fileType === 'ui' ? '.wdims_ui.json' : '.wdims_engine.json';
  const fileName = `${profileName}${extension}`;
  return path.join(profileDir, fileName);
}

// プロファイル設定ファイルを検索（読み込み用）
async function findSettingsFile(profileDir: string, fileType: 'ui' | 'engine'): Promise<{ path: string; hasMultiple: boolean }> {
  const extension = fileType === 'ui' ? '.wdims_ui.json' : '.wdims_engine.json';

  try {
    const entries = await fs.readdir(profileDir);
    const matchingFiles = entries.filter(file => file.endsWith(extension));

    if (matchingFiles.length === 0) {
      throw new Error(`No ${extension} file found in ${profileDir}`);
    }

    return {
      path: path.join(profileDir, matchingFiles[0]),
      hasMultiple: matchingFiles.length > 1
    };
  } catch (error) {
    throw new Error(`Failed to find settings file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// プロファイル取得
export async function getProfile(profileName: string): Promise<Profile> {
  validateProfileName(profileName);
  const profileDir = path.join(PROFILES_DIR, profileName);

  try {
    const uiFileInfo = await findSettingsFile(profileDir, 'ui');
    const engineFileInfo = await findSettingsFile(profileDir, 'engine');

    const displaySettings: DisplaySettings = JSON.parse(
      await fs.readFile(uiFileInfo.path, 'utf8')
    );

    const searchEngines: SearchEnginesConfig = JSON.parse(
      await fs.readFile(engineFileInfo.path, 'utf8')
    );

    const profile: Profile = { displaySettings, searchEngines };

    // 複数ファイル警告を追加
    if (uiFileInfo.hasMultiple || engineFileInfo.hasMultiple) {
      profile.warnings = {
        multipleUiFiles: uiFileInfo.hasMultiple,
        multipleEngineFiles: engineFileInfo.hasMultiple
      };
    }

    return profile;
  } catch (error) {
    console.error(`Failed to load profile "${profileName}":`, error);
    throw new Error(`Profile "${profileName}" not found or invalid`);
  }
}

// プロファイル作成
export async function createProfile(profileName: string, copyFrom: string | null = null): Promise<void> {
  validateProfileName(profileName);
  const newProfileDir = path.join(PROFILES_DIR, profileName);

  try {
    await fs.mkdir(newProfileDir, { recursive: true });

    if (copyFrom) {
      validateProfileName(copyFrom);
      const sourceDir = path.join(PROFILES_DIR, copyFrom);

      // コピー元のファイルを検索
      const sourceUiInfo = await findSettingsFile(sourceDir, 'ui');
      const sourceEngineInfo = await findSettingsFile(sourceDir, 'engine');

      // コピー元の内容を読み込んで新しいファイル名で保存
      const uiContent = await fs.readFile(sourceUiInfo.path, 'utf8');
      const engineContent = await fs.readFile(sourceEngineInfo.path, 'utf8');

      await fs.writeFile(
        getSettingsFilePath(newProfileDir, 'ui', profileName),
        uiContent
      );
      await fs.writeFile(
        getSettingsFilePath(newProfileDir, 'engine', profileName),
        engineContent
      );
    } else {
      // 空の設定ファイルを作成
      const defaultDisplaySettings: DisplaySettings = {
        theme: 'light',
        cardScale: 1.0,
        fontSize: 1.0,
        cardsPerRowMode: 'auto',
        minCardsPerRow: 4,
        showName: true,
        showDescription: true,
        showUrl: true
      };

      const defaultSearchEngines: SearchEnginesConfig = {
        tabs: []
      };

      await fs.writeFile(
        getSettingsFilePath(newProfileDir, 'ui', profileName),
        JSON.stringify(defaultDisplaySettings, null, 2)
      );
      await fs.writeFile(
        getSettingsFilePath(newProfileDir, 'engine', profileName),
        JSON.stringify(defaultSearchEngines, null, 2)
      );
    }
  } catch (error) {
    console.error(`Failed to create profile "${profileName}":`, error);
    throw error;
  }
}

// 表示設定更新
export async function updateDisplaySettings(profileName: string, settings: DisplaySettings): Promise<void> {
  validateProfileName(profileName);
  const profileDir = path.join(PROFILES_DIR, profileName);

  try {
    // 既存のファイルを検索
    const fileInfo = await findSettingsFile(profileDir, 'ui');
    // 既存のファイルに上書き保存
    await fs.writeFile(fileInfo.path, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error(`Failed to update display settings for "${profileName}":`, error);
    throw error;
  }
}

// 検索エンジン設定更新
export async function updateSearchEngines(profileName: string, engines: SearchEnginesConfig): Promise<void> {
  validateProfileName(profileName);
  const profileDir = path.join(PROFILES_DIR, profileName);

  try {
    // 既存のファイルを検索
    const fileInfo = await findSettingsFile(profileDir, 'engine');
    // 既存のファイルに上書き保存
    await fs.writeFile(fileInfo.path, JSON.stringify(engines, null, 2));
  } catch (error) {
    console.error(`Failed to update search engines for "${profileName}":`, error);
    throw error;
  }
}

// プロファイル削除
export async function deleteProfile(profileName: string): Promise<void> {
  if (profileName === 'default') {
    throw new Error('Cannot delete default profile');
  }
  validateProfileName(profileName);
  const profileDir = path.join(PROFILES_DIR, profileName);

  try {
    await fs.rm(profileDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete profile "${profileName}":`, error);
    throw error;
  }
}

// プロファイル複製
export async function cloneProfile(sourceName: string, newName: string): Promise<void> {
  validateProfileName(sourceName);
  validateProfileName(newName);

  const sourceDir = path.join(PROFILES_DIR, sourceName);
  const newDir = path.join(PROFILES_DIR, newName);

  try {
    // コピー元が存在するか確認
    await fs.access(sourceDir);

    // 新しいディレクトリを作成
    await fs.mkdir(newDir, { recursive: true });

    // コピー元のファイルを検索
    const sourceUiInfo = await findSettingsFile(sourceDir, 'ui');
    const sourceEngineInfo = await findSettingsFile(sourceDir, 'engine');

    // コピー元の内容を読み込んで新しいファイル名で保存
    const uiContent = await fs.readFile(sourceUiInfo.path, 'utf8');
    const engineContent = await fs.readFile(sourceEngineInfo.path, 'utf8');

    await fs.writeFile(
      getSettingsFilePath(newDir, 'ui', newName),
      uiContent
    );
    await fs.writeFile(
      getSettingsFilePath(newDir, 'engine', newName),
      engineContent
    );
  } catch (error) {
    console.error(`Failed to clone profile "${sourceName}" to "${newName}":`, error);
    throw error;
  }
}

// プロファイル名変更
export async function renameProfile(oldName: string, newName: string): Promise<void> {
  if (oldName === 'default') {
    throw new Error('Cannot rename default profile');
  }
  validateProfileName(oldName);
  validateProfileName(newName);

  const oldDir = path.join(PROFILES_DIR, oldName);
  const newDir = path.join(PROFILES_DIR, newName);

  try {
    await fs.rename(oldDir, newDir);
  } catch (error) {
    console.error(`Failed to rename profile "${oldName}" to "${newName}":`, error);
    throw error;
  }
}

// アクティブプロファイル取得
export async function getActiveProfile(): Promise<string> {
  try {
    const content = await fs.readFile(ACTIVE_PROFILE_FILE, 'utf8');
    return content.trim();
  } catch {
    return 'default';
  }
}

// アクティブプロファイル設定
export async function setActiveProfile(profileName: string): Promise<void> {
  validateProfileName(profileName);
  try {
    await fs.writeFile(ACTIVE_PROFILE_FILE, profileName);
  } catch (error) {
    console.error(`Failed to set active profile to "${profileName}":`, error);
    throw error;
  }
}
