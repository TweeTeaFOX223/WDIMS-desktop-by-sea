# WDIMS ローカルサーバー版 実装チェックリスト

## ✅ 完了済み（サーバー側）

### サーバーインフラ
- [x] Hono.jsサーバーの実装 (`server/index-hono.cjs`)
- [x] Socket.ioによるWebSocket実装 (`server/websocket.cjs`)
- [x] ファイルベース設定管理 (`config/profiles/`)
- [x] セキュリティ対策（ローカルホスト制限、パストラバーサル対策）

### API実装
- [x] GET /api/profiles - プロファイル一覧取得
- [x] GET /api/profiles/:name - 特定プロファイル取得
- [x] POST /api/profiles - 新規プロファイル作成
- [x] PUT /api/profiles/:name/display-settings - 表示設定更新
- [x] PUT /api/profiles/:name/search-engines - 検索エンジン設定更新
- [x] DELETE /api/profiles/:name - プロファイル削除
- [x] POST /api/profiles/:name/clone - プロファイル複製
- [x] PUT /api/profiles/:name/rename - プロファイル名変更
- [x] GET /api/profiles/active/current - アクティブプロファイル取得
- [x] PUT /api/profiles/active/current - アクティブプロファイル変更
- [x] GET /api/browsers - ブラウザ設定取得
- [x] PUT /api/browsers - ブラウザ設定更新

### サーバーユーティリティ
- [x] profileManager.cjs（プロファイル操作）
- [x] browserLauncher.cjs（ブラウザ自動起動）
- [x] WebSocketイベントハンドリング

### ビルド・実行
- [x] Node.js SEAビルドスクリプト (`scripts/build-sea.cjs`)
- [x] package.jsonスクリプト設定

---

## ❌ 未実装（クライアント側 - 最重要）

### 1. App.tsx の改修
**現状**: localStorageを使用
**必要な変更**:
- [ ] アプリ起動時にアクティブプロファイルを取得 (`getActiveProfile()`)
- [ ] プロファイル設定を`getProfile(profileName)`で読み込み
- [ ] 設定変更時に`updateDisplaySettings()`と`updateSearchEngines()`を呼び出し
- [ ] WebSocket接続を初期化 (`initializeWebSocket()`)
- [ ] WebSocketイベントリスナーを設定
  - `display-settings-changed` - 他のクライアントからの表示設定変更を受信
  - `search-engines-changed` - 他のクライアントからの検索エンジン設定変更を受信
  - `profile-switched` - プロファイル切り替え通知を受信

**ファイル**: `src/App.tsx`

### 2. Settings.tsx の改修
**現状**: localStorageを使用
**必要な変更**:
- [ ] localStorage関数の代わりにAPI関数を使用
- [ ] 設定変更時にWebSocketで他のクライアントに通知
- [ ] デバウンス処理を追加（頻繁なAPI呼び出しを防ぐ）

**ファイル**: `src/components/Settings.tsx`

### 3. 新規コンポーネント作成

#### 3-1. ProfileSelector コンポーネント
**目的**: プロファイル切り替えUI
**機能**:
- [ ] プロファイル一覧をドロップダウンで表示
- [ ] 現在のアクティブプロファイルを表示
- [ ] プロファイル選択時に切り替え処理
- [ ] WebSocketでプロファイル切り替えを通知

**ファイル**: `src/components/ProfileSelector.tsx`（新規作成）

#### 3-2. ProfileManager コンポーネント
**目的**: プロファイル管理UI
**機能**:
- [ ] プロファイル一覧の表示
- [ ] 新規プロファイル作成モーダル
  - [ ] プロファイル名入力
  - [ ] コピー元プロファイル選択（オプション）
- [ ] プロファイル複製機能
- [ ] プロファイル削除機能（確認ダイアログ付き、defaultは削除不可）
- [ ] プロファイル名変更機能
- [ ] WebSocketでプロファイル一覧変更を通知

**ファイル**: `src/components/ProfileManager.tsx`（新規作成）

#### 3-3. BrowserSettings コンポーネント
**目的**: ブラウザ起動設定UI
**機能**:
- [ ] ブラウザ一覧の表示
- [ ] 各ブラウザの有効/無効チェックボックス
- [ ] ブラウザパス編集フィールド
- [ ] 起動引数編集フィールド
- [ ] 「保存」ボタン
- [ ] デフォルトポート設定

**ファイル**: `src/components/BrowserSettings.tsx`（新規作成）

### 4. AddEngineModal / EditEngineModal の改修
**現状**: localStorageを使用
**必要な変更**:
- [ ] 検索エンジン追加/編集時にAPI呼び出し
- [ ] WebSocketで変更を通知

**ファイル**:
- `src/components/AddEngineModal.tsx`
- `src/components/EditEngineModal.tsx`

### 5. AddTabModal / EditTabModal / DeleteTabModal の改修
**現状**: localStorageを使用
**必要な変更**:
- [ ] タブ追加/編集/削除時にAPI呼び出し
- [ ] WebSocketで変更を通知

**ファイル**:
- `src/components/AddTabModal.tsx`
- `src/components/EditTabModal.tsx`
- `src/components/DeleteTabModal.tsx`

### 6. WebSocket統合の実装
**必要な作業**:
- [ ] App.tsxでWebSocket接続を初期化
- [ ] 設定変更時にWebSocketイベントを送信
- [ ] 他のクライアントからの変更を受信してUIを更新
- [ ] 接続エラー時の再接続処理
- [ ] 切断時の通知表示

### 7. UIの追加・調整
- [ ] ヘッダーにProfileSelectorを追加
- [ ] Settingsパネルに「プロファイル管理」タブを追加
- [ ] Settingsパネルに「ブラウザ起動設定」タブを追加
- [ ] 設定保存状態のインジケーター追加（保存中/保存済み）
- [ ] ローディング表示（プロファイル切り替え時）
- [ ] エラー通知の表示機能

---

## 📋 実装の優先順位

### フェーズ1: コア機能（必須）
1. **App.tsx の改修** - localStorage→API変換（最重要）
2. **WebSocket統合** - リアルタイム同期
3. **Settings.tsx の改修** - 設定変更のAPI化

### フェーズ2: プロファイル管理（重要）
4. **ProfileSelector コンポーネント** - プロファイル切り替えUI
5. **ProfileManager コンポーネント** - プロファイル管理UI

### フェーズ3: 追加機能（推奨）
6. **BrowserSettings コンポーネント** - ブラウザ起動設定UI
7. **モーダルコンポーネントの改修** - Add/Edit系の全モーダル

### フェーズ4: UX改善（オプション）
8. **UIの追加・調整** - インジケーター、ローディング、通知等

---

## 🔧 技術的な注意点

### localStorage → API変換パターン
```typescript
// Before (Web版)
const settings = loadSettings();
saveSettings(newSettings);

// After (サーバー版)
const activeProfile = await getActiveProfile();
const profile = await getProfile(activeProfile);
const settings = profile.displaySettings;

await updateDisplaySettings(activeProfile, newSettings);
broadcastDisplaySettingsUpdate(activeProfile, newSettings); // WebSocket
```

### WebSocket使用パターン
```typescript
// 初期化（App.tsxで1回のみ）
useEffect(() => {
  const socket = initializeWebSocket();

  onDisplaySettingsChanged(({ profileName, settings }) => {
    if (profileName === currentProfile) {
      setSettings(settings);
    }
  });

  return () => closeWebSocket();
}, []);

// 設定変更時（各コンポーネント）
const handleSettingsChange = async (newSettings) => {
  setSettings(newSettings);
  await updateDisplaySettings(activeProfile, newSettings);
  broadcastDisplaySettingsUpdate(activeProfile, newSettings);
};
```

### デバウンス処理
```typescript
import { debounce } from 'lodash-es';

const debouncedUpdate = debounce(async (settings) => {
  await updateDisplaySettings(activeProfile, settings);
  broadcastDisplaySettingsUpdate(activeProfile, settings);
}, 500);
```

---

## ✅ 完了判定基準

各機能は以下の条件を満たした時点で完了とする：

1. **App.tsx改修**: localStorageが完全に削除され、API呼び出しに置き換わっている
2. **WebSocket統合**: 複数ブラウザで設定変更が即座に同期される
3. **ProfileSelector**: プロファイルを切り替えると全ての設定が変更される
4. **ProfileManager**: プロファイルの作成・複製・削除・名前変更が全て動作する
5. **BrowserSettings**: ブラウザ設定を変更してサーバー再起動時に反映される

---

## 📝 備考

- **最重要**: App.tsxとSettings.tsxの改修が最優先。これがないとサーバー版として機能しない
- **リアルタイム同期**: WebSocket統合はユーザー体験の核となる機能
- **プロファイル管理**: 新規UIコンポーネントの実装が必要
- **段階的実装**: フェーズ1→2→3→4の順で実装することを推奨
