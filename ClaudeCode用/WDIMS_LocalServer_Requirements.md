# World Dev Info Meta Searcher - ローカルサーバー版 要件定義書

## プロジェクト概要

既存のworld-dev-info-metasearcher（ブラウザ単体動作版）を、ローカルサーバー＋ファイルベース設定管理に変更したバージョンを開発する。

**元プロジェクト**: https://github.com/TweeTeaFOX223/world-dev-info-metasearcher

## 主な変更点と要件

### 1. 設定の保存先変更（最重要）

#### 現行仕様
- ブラウザのローカルストレージに設定を保存
- シークレットモード使用時やブラウザ間で設定が分離される

#### 新仕様
```
project-root/
├── config/
│   ├── profiles/
│   │   ├── default/                      # デフォルトプロファイル
│   │   │   ├── display-settings.json     # 表示設定（元のWeb版と同じ形式）
│   │   │   └── search-engines.json       # 検索エンジン設定（元のWeb版と同じ形式）
│   │   ├── development/                  # 開発用プロファイル（例）
│   │   │   ├── display-settings.json
│   │   │   └── search-engines.json
│   │   └── research/                     # 調査用プロファイル（例）
│   │       ├── display-settings.json
│   │       └── search-engines.json
│   ├── browsers.json                     # ブラウザ起動設定（共通）
│   └── active-profile.txt                # 現在アクティブなプロファイル名
├── server/
│   └── index.js                          # ローカルサーバー本体
└── client/
    └── (Webクライアントファイル群)
```

#### プロファイルの構造

各プロファイルは**ディレクトリ単位**で管理され、その中に2つのJSONファイルを配置：

**1. display-settings.json（表示設定）**
```json
{
  "theme": "light",
  "gridColumns": 3,
  "showDescriptions": true,
  "density": "comfortable"
}
```
※元のWeb版（ローカルストレージ保存）と**完全に同じ形式**

**2. search-engines.json（検索エンジン設定）**
```json
{
  "tabs": [
    {
      "id": "tech-blogs",
      "name": "技術ブログ",
      "engines": [
        {
          "id": "zenn",
          "name": "Zenn",
          "url": "https://zenn.dev/search?q={query}",
          "description": "日本の技術記事プラットフォーム",
          "icon": "https://zenn.dev/favicon.ico"
        }
      ]
    }
  ]
}
```
※元のWeb版（ローカルストレージ保存）と**完全に同じ形式**

**3. active-profile.txt（アクティブプロファイル名）**
```
default
```
※シンプルにプロファイル名のみを記載

**4. browsers.json（ブラウザ起動設定・共通）**
```json
{
  "browsers": [
    {
      "name": "Chrome",
      "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "enabled": true,
      "args": ["--new-window"]
    }
  ],
  "defaultPort": 3000
}
```
※プロファイル間で共有される設定

### 2. アーキテクチャ変更

#### 動作モデル
```
[ローカルサーバー起動]
      ↓
[設定したブラウザで自動的に開く]
      ↓
[http://localhost:PORT でアプリにアクセス]
      ↓
[複数ブラウザ・複数タブで同時利用可能]
```

#### サーバー実装例（Hono.js + Socket.io使用）⭐推奨

```typescript
// server/index.ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Server } from 'socket.io';
import profileRoutes from './routes/profiles';
import browserRoutes from './routes/browsers';
import { setupWebSocket } from './websocket';

const app = new Hono();

// ミドルウェア（Hono組み込み）
app.use('*', logger());
app.use('*', cors());

// API Routes
app.route('/api/profiles', profileRoutes);
app.route('/api/browsers', browserRoutes);

// 静的ファイル配信
app.use('/*', serveStatic({ root: './dist' }));

// サーバー起動
const port = 3000;
const server = serve({
  fetch: app.fetch,
  port
});

// Socket.io設定（重要: wsではなくSocket.io使用）
const io = new Server(server, {
  cors: {
    origin: '*', // ローカルなので全許可
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

setupWebSocket(io);

console.log(`🚀 Server running at http://localhost:${port}`);

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  io.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ブラウザ自動起動
import { launchBrowsers } from './utils/browserLauncher';
launchBrowsers(port);
```

```typescript
// server/websocket.ts
import { Server, Socket } from 'socket.io';
import { updateDisplaySettings, updateSearchEngines } from './utils/profileManager';

export function setupWebSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // 表示設定更新
    socket.on('display-settings-update', async (data) => {
      try {
        const { profileName, settings } = data;
        await updateDisplaySettings(profileName, settings);
        
        // 他のクライアントにブロードキャスト
        socket.broadcast.emit('display-settings-changed', { profileName, settings });
      } catch (error) {
        console.error('Display settings update error:', error);
        socket.emit('error', { message: 'Failed to update display settings' });
      }
    });

    // 検索エンジン設定更新
    socket.on('search-engines-update', async (data) => {
      try {
        const { profileName, engines } = data;
        await updateSearchEngines(profileName, engines);
        
        // 他のクライアントにブロードキャスト
        socket.broadcast.emit('search-engines-changed', { profileName, engines });
      } catch (error) {
        console.error('Search engines update error:', error);
        socket.emit('error', { message: 'Failed to update search engines' });
      }
    });

    // プロファイル切り替え
    socket.on('profile-switch', async (data) => {
      const { profileName } = data;
      socket.broadcast.emit('profile-switched', { profileName });
    });

    // 切断処理
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // エラーハンドリング
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
}
```



**重要**: 上記の実装では`ws`ライブラリではなく、**Socket.io**を使用しています。これはNode.js SEA互換性のための必須要件です。

#### 技術スタック候補

**サーバー側（必須）**

**✅ 推奨: Hono.js + Node.js Adapter + Socket.io**
- **Hono.js**: TypeScript完全対応、Express比2-3倍高速、組み込みミドルウェア充実
- **Socket.io**: WebSocket実装（ピュアJavaScript、Node.js SEA互換）
- **理由**: TypeScript統合、軽量・高速、本番環境使用可能

**❌ 使用禁止: ws（WebSocketライブラリ）**
- **理由**: ネイティブモジュール（`bufferutil`, `utf-8-validate`）を使用
- **問題**: Node.js SEAでネイティブモジュールは動作しない可能性が高い
- **代替**: Socket.io（ピュアJavaScript実装、SEA互換）

**代替案: Express.js + Socket.io（従来型）**
- 成熟したエコシステム、豊富なミドルウェア
- より多くのドキュメントとコミュニティサポート
- ただしHono.jsより低速、バンドルサイズ大

**WebSocketライブラリ選定**

**✅ 推奨: Socket.io**
```javascript
// サーバー
import { Server } from 'socket.io';
const io = new Server(httpServer);

// クライアント
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');
```

**メリット**:
- ✅ ピュアJavaScript実装（ネイティブモジュール不使用）
- ✅ Node.js SEA完全互換
- ✅ 自動再接続機能
- ✅ 認証・ルーム機能組み込み
- ✅ フォールバック機能（WebSocket使えない場合）

**❌ 使用禁止: ws（単体）**
```javascript
// ❌ これは使わない
import WebSocket from 'ws';
const wss = new WebSocket.Server({ port: 8080 });
```

**理由**:
- ネイティブモジュール依存（`bufferutil`, `utf-8-validate`）
- Node.js SEAでビルドエラーまたは実行時エラーの可能性
- Socket.ioの方が機能豊富

**クライアント側（推奨）**

以下の選択肢から選定：

**選択肢A: Preact（現行維持）+ Socket.io Client** ⭐推奨
- 既存コードの移植が容易
- 軽量性維持（バンドルサイズ小）
- デスクトップ特化で問題なし
- TypeScript対応良好
- Socket.ioとの組み合わせ実績多数

**選択肢B: React + Vite + Socket.io Client**
- より豊富なエコシステム
- TypeScript統合が強力
- HMR（Hot Module Replacement）が開発時に便利

**選択肢C: Svelte + Vite + Socket.io Client**
- 最も軽量なバンドルサイズ
- リアクティビティがシンプル
- TypeScript対応良好

**選択肢D: Vue.js + Vite + Socket.io Client**
- 段階的な学習曲線
- TypeScript対応
- 日本語ドキュメント充実

**最終推奨構成**: **Hono.js + Socket.io + Preact** 
- 理由: 
  - TypeScript完全統合で開発体験が統一
  - 既存コードベースの再利用性
  - 軽量・高速な実行環境
  - Node.js SEA完全互換
  - WebSocket再接続・認証等の機能充実

**モバイル対応について**

今回の要件では**デスクトップ特化**が主目的だが、将来的なモバイル対応の選択肢：

**選択肢1: Tauri 2.0（最新・推奨）** ⭐
- **クロスプラットフォーム**: デスクトップ（Windows/Mac/Linux）+ モバイル（Android/iOS）
- **軽量**: OSネイティブWebViewを使用（バイナリサイズ600KB～）
- **セキュア**: Rust製バックエンド、小さな攻撃面
- **React Native Web対応**: Expoと組み合わせてモバイル・デスクトップ両対応可能
- **パフォーマンス**: Electronより高速・省メモリ
- **2025年対応**: Tauri 2.0でモバイルサポート正式リリース済み

**選択肢2: Electron（従来型）**
- 成熟したエコシステム
- デスクトップのみ対応（Windows/Mac/Linux）
- バイナリサイズ大（~100MB）
- Chromiumバンドル

**選択肢3: Expo + Electron（React Native統合）**
- 1つのコードベースでモバイル・Web・デスクトップ対応
- `expo-electron-adapter`は実験的（2019年以降メンテナンス停滞）
- 現在はTauriの方が推奨される

**結論**: 
- 今回は**デスクトップ特化で開発**
- 将来的なモバイル対応が必要になった場合は**Tauri 2.0**を検討
- Tauriなら既存のPreact/Reactコードを再利用可能

---

### 技術選定の注意事項

#### ❌ 絶対に使用してはいけない技術・パターン

1. **ws（WebSocketライブラリ）単体での使用**
   ```javascript
   // ❌ 禁止
   import WebSocket from 'ws';
   ```
   - 理由: ネイティブモジュール依存、Node.js SEA非互換

2. **ネイティブモジュールを含むライブラリ**
   ```javascript
   // ❌ 以下は避ける
   import bcrypt from 'bcrypt';        // ネイティブモジュール
   import sqlite3 from 'sqlite3';      // ネイティブモジュール
   import sharp from 'sharp';          // ネイティブモジュール
   ```
   - 理由: Node.js SEAで動作しない
   - 代替: bcryptjs（純JS）, better-sqlite3（条件付き可）等

3. **ES Modules形式のままでのSEAビルド**
   ```javascript
   // ❌ SEAビルド時はこのまま使えない
   import { Hono } from 'hono';
   export default app;
   ```
   - 理由: Node.js SEAはCommonJSのみサポート
   - 対策: ESBuild/Rollupでバンドル→CommonJS変換

4. **動的require**
   ```javascript
   // ❌ SEAで動作しない
   const moduleName = getModuleName();
   const module = require(moduleName);
   ```
   - 理由: SEAは静的解析でバンドル
   - 対策: すべて静的importに変更

#### ⚠️ 条件付きで使用可能（要注意）

1. **Hono.jsの一部ミドルウェア**
   - キャッシュミドルウェア: Cloudflare/Deno特化（Node.jsでは未対応）
   - 対策: 必要なら独自実装

2. **大きなファイルのストリーミング**
   - `serveStatic`は小さなファイル向け
   - 対策: 今回は小さな設定ファイルのみなので問題なし

#### ✅ 推奨される代替技術

| 避けるべき | 推奨代替 | 理由 |
|-----------|---------|------|
| ws | Socket.io | SEA互換、機能豊富 |
| bcrypt | bcryptjs | 純JS実装 |
| node-gyp依存 | 純JS実装 | SEA互換性 |
| ES Modules | バンドル→CommonJS | SEA要件 |

### 3. プロファイル管理機能

#### UIでの操作
- **プロファイル切り替え**: ドロップダウンで選択
- **新規プロファイル作成**: モーダルで名前入力 → 現在の設定をコピーして新規ディレクトリ作成
- **プロファイルコピー**: 既存プロファイルディレクトリを複製して新規作成
- **プロファイル削除**: 確認ダイアログ表示後にディレクトリごと削除（defaultは削除不可）
- **プロファイル名変更**: ディレクトリ名をリネーム

#### API設計例
```javascript
// GET /api/profiles - プロファイル一覧取得（ディレクトリ名のリスト）
// Response: ["default", "development", "research"]

// GET /api/profiles/:name - 特定プロファイル取得
// Response: {
//   displaySettings: { /* display-settings.json の内容 */ },
//   searchEngines: { /* search-engines.json の内容 */ }
// }

// POST /api/profiles - 新規プロファイル作成
// Body: { 
//   name: "new-profile",
//   copyFrom: "default"  // コピー元（省略時は空）
// }

// PUT /api/profiles/:name/display-settings - 表示設定更新
// Body: { theme: "dark", gridColumns: 4, ... }

// PUT /api/profiles/:name/search-engines - 検索エンジン設定更新
// Body: { tabs: [...] }

// DELETE /api/profiles/:name - プロファイル削除（ディレクトリごと）

// POST /api/profiles/:name/clone - プロファイル複製
// Body: { newName: "copied-profile" }

// PUT /api/profiles/:name/rename - プロファイル名変更
// Body: { newName: "renamed-profile" }

// GET /api/active-profile - アクティブなプロファイル名取得
// Response: "default"

// PUT /api/active-profile - アクティブなプロファイル変更
// Body: { profileName: "development" }
```

#### ファイル操作の実装例

```javascript
// server/utils/profileManager.js
const fs = require('fs').promises;
const path = require('path');

const PROFILES_DIR = path.join(__dirname, '../../config/profiles');
const ACTIVE_PROFILE_FILE = path.join(__dirname, '../../config/active-profile.txt');

// プロファイル一覧取得
async function listProfiles() {
  const entries = await fs.readdir(PROFILES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

// プロファイル取得
async function getProfile(profileName) {
  const profileDir = path.join(PROFILES_DIR, profileName);
  
  const displaySettings = JSON.parse(
    await fs.readFile(path.join(profileDir, 'display-settings.json'), 'utf8')
  );
  
  const searchEngines = JSON.parse(
    await fs.readFile(path.join(profileDir, 'search-engines.json'), 'utf8')
  );
  
  return { displaySettings, searchEngines };
}

// プロファイル作成
async function createProfile(profileName, copyFrom = null) {
  const newProfileDir = path.join(PROFILES_DIR, profileName);
  await fs.mkdir(newProfileDir);
  
  if (copyFrom) {
    const sourceDir = path.join(PROFILES_DIR, copyFrom);
    await fs.copyFile(
      path.join(sourceDir, 'display-settings.json'),
      path.join(newProfileDir, 'display-settings.json')
    );
    await fs.copyFile(
      path.join(sourceDir, 'search-engines.json'),
      path.join(newProfileDir, 'search-engines.json')
    );
  } else {
    // 空の設定ファイルを作成
    await fs.writeFile(
      path.join(newProfileDir, 'display-settings.json'),
      JSON.stringify({ theme: 'light', gridColumns: 3, showDescriptions: true }, null, 2)
    );
    await fs.writeFile(
      path.join(newProfileDir, 'search-engines.json'),
      JSON.stringify({ tabs: [] }, null, 2)
    );
  }
}

// 表示設定更新
async function updateDisplaySettings(profileName, settings) {
  const filePath = path.join(PROFILES_DIR, profileName, 'display-settings.json');
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
}

// 検索エンジン設定更新
async function updateSearchEngines(profileName, engines) {
  const filePath = path.join(PROFILES_DIR, profileName, 'search-engines.json');
  await fs.writeFile(filePath, JSON.stringify(engines, null, 2));
}

// プロファイル削除
async function deleteProfile(profileName) {
  if (profileName === 'default') {
    throw new Error('Cannot delete default profile');
  }
  const profileDir = path.join(PROFILES_DIR, profileName);
  await fs.rm(profileDir, { recursive: true });
}

// アクティブプロファイル取得
async function getActiveProfile() {
  try {
    return (await fs.readFile(ACTIVE_PROFILE_FILE, 'utf8')).trim();
  } catch {
    return 'default';
  }
}

// アクティブプロファイル設定
async function setActiveProfile(profileName) {
  await fs.writeFile(ACTIVE_PROFILE_FILE, profileName);
}

module.exports = {
  listProfiles,
  getProfile,
  createProfile,
  updateDisplaySettings,
  updateSearchEngines,
  deleteProfile,
  getActiveProfile,
  setActiveProfile
};
```

### 4. ブラウザ起動設定

#### browsers.json構造
```json
{
  "browsers": [
    {
      "name": "Chrome",
      "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "enabled": true,
      "args": ["--new-window"]
    },
    {
      "name": "Firefox",
      "path": "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "enabled": false,
      "args": ["-new-window"]
    },
    {
      "name": "Edge",
      "path": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "enabled": false,
      "args": ["--new-window"]
    }
  ],
  "defaultPort": 3000
}
```

#### 起動処理
```javascript
// サーバー起動時
const { exec } = require('child_process');
const browsersConfig = require('./config/browsers.json');

browsersConfig.browsers
  .filter(b => b.enabled)
  .forEach(browser => {
    const args = browser.args.join(' ');
    exec(`"${browser.path}" ${args} http://localhost:${browsersConfig.defaultPort}`);
  });
```

#### UI上での設定
- 設定パネルに「ブラウザ起動設定」タブを追加
- チェックボックスで各ブラウザの有効/無効を切り替え
- パス編集フィールド
- 「適用して再起動」ボタン

### 5. リアルタイム設定同期（Socket.io使用）

#### WebSocketによる同期

**重要**: `ws`ライブラリではなく**Socket.io**を使用します。理由はNode.js SEA互換性です。

```javascript
// サーバー側（Socket.io）
import { Server } from 'socket.io';
import fs from 'fs/promises';

export function setupWebSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 表示設定変更をブロードキャスト
    socket.on('display-settings-update', async (data) => {
      const { profileName, settings } = data;
      
      // ファイルに保存
      const filePath = `./config/profiles/${profileName}/display-settings.json`;
      await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
      
      // 他の接続中クライアントに通知（送信者以外）
      socket.broadcast.emit('display-settings-changed', { profileName, settings });
    });
    
    // 検索エンジン設定変更をブロードキャスト
    socket.on('search-engines-update', async (data) => {
      const { profileName, engines } = data;
      
      // ファイルに保存
      const filePath = `./config/profiles/${profileName}/search-engines.json`;
      await fs.writeFile(filePath, JSON.stringify(engines, null, 2));
      
      // 他の接続中クライアントに通知
      socket.broadcast.emit('search-engines-changed', { profileName, engines });
    });
    
    // プロファイル切り替え
    socket.on('profile-switch', async (data) => {
      const { profileName } = data;
      await fs.writeFile('./config/active-profile.txt', profileName);
      socket.broadcast.emit('profile-switched', { profileName });
    });

    // 切断処理
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
```

```typescript
// クライアント側（Socket.io Client）
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export function connectWebSocket() {
  socket = io('http://localhost:3000', {
    reconnection: true,           // 自動再接続
    reconnectionDelay: 1000,      // 再接続遅延
    reconnectionDelayMax: 5000,   // 最大再接続遅延
    reconnectionAttempts: 10      // 再接続試行回数
  });

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  // 表示設定変更の受信
  socket.on('display-settings-changed', (data) => {
    const { profileName, settings } = data;
    // 現在表示中のプロファイルと同じなら即座に反映
    if (profileName === currentProfile) {
      updateDisplaySettings(settings);
    }
  });

  // 検索エンジン設定変更の受信
  socket.on('search-engines-changed', (data) => {
    const { profileName, engines } = data;
    if (profileName === currentProfile) {
      updateSearchEngines(engines);
    }
  });

  // プロファイル切り替え通知
  socket.on('profile-switched', (data) => {
    const { profileName } = data;
    showNotification(`プロファイルが ${profileName} に切り替わりました`);
  });

  return socket;
}

// 設定変更の送信
export function updateSettings(profileName: string, settings: any) {
  socket.emit('display-settings-update', { profileName, settings });
}
```

#### Preactコンポーネントでの使用例

```typescript
// components/Settings.tsx
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { io, Socket } from 'socket.io-client';

export function Settings() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Socket.io接続
    const newSocket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('display-settings-changed', (data) => {
      if (data.profileName === currentProfile) {
        setSettings(data.settings);
      }
    });

    setSocket(newSocket);

    // クリーンアップ
    return () => {
      newSocket.close();
    };
  }, []);

  const handleUpdate = (newSettings) => {
    // ローカル状態を更新
    setSettings(newSettings);
    
    // サーバーに送信（他のクライアントに同期）
    socket?.emit('display-settings-update', {
      profileName: currentProfile,
      settings: newSettings
    });
  };

  return (
    <div>
      {/* 設定UI */}
    </div>
  );
}
```

#### 同期対象
- **表示設定の変更**（display-settings.json）
- **検索エンジンの追加・削除・編集**（search-engines.json）
- **タブの追加・削除・並び替え**（search-engines.json内のtabs配列）
- **プロファイル切り替え**（active-profile.txt）
- **プロファイルの作成・削除・リネーム**（profilesディレクトリ）

#### Socket.ioの利点（wsとの比較）

| 機能 | Socket.io ✅ | ws ❌ |
|------|-------------|-------|
| 自動再接続 | 組み込み | 自作必要 |
| 認証機能 | 組み込み | 自作必要 |
| ルーム機能 | 組み込み | 自作必要 |
| フォールバック | あり | なし |
| SEA互換性 | 完全互換 | 制限あり |
| 学習曲線 | 低い | 低い |

### 6. 起動・実行方法

#### 開発時
```bash
# 依存関係インストール
npm install

# 開発サーバー起動（自動的にブラウザが開く）
npm run dev
```

#### 本番ビルド
```bash
# クライアントをビルド
npm run build

# サーバー起動
npm start
# または
node server/index.js
```

#### 実行ファイル化（オプション）

単一実行ファイルとして配布する方法は複数あり、2025年時点での推奨度が異なります：

**方法1: Node.js公式SEA（Single Executable Applications）** ⭐最推奨（2025年）

Node.js v20以降で正式サポートされたネイティブ機能：

```bash
# 1. SEA設定ファイル作成
echo '{
  "main": "server/index.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true,
  "assets": {
    "config": "./config"
  }
}' > sea-config.json

# 2. Blobファイル生成
node --experimental-sea-config sea-config.json

# 3. Node.jsバイナリをコピー
cp $(which node) wdims.exe  # Windows
cp $(which node) wdims      # Linux/Mac

# 4. 署名削除（Windows/Macのみ）
# Windows: signtoolを使用
# Mac: codesign --remove-signature wdims

# 5. Blob注入
npx postject wdims.exe NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

**メリット**:
- Node.js公式機能（最も将来性がある）
- 追加ツール不要
- セキュリティが高い
- バイナリサイズが比較的小さい
- クロスプラットフォームビルド対応

**デメリット**:
- 手動ステップが多い（自動化スクリプトで解決可能）
- まだ実験的機能（v20以降で安定化）

**方法2: pkg（Vercel製）** ⚠️非推奨（メンテナンス停止）

```bash
npm install -g pkg
pkg server/index.js --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --output wdims
```

**メリット**:
- 使用が非常に簡単
- クロスプラットフォーム一発ビルド

**デメリット**:
- 2022年以降メンテナンス停止
- ES Modulesサポートが不完全
- Node.js新バージョンへの追従なし
- コミュニティフォークはあるが公式推奨ではない

**方法3: nexe** ⚠️限定的推奨

```bash
npm install -g nexe
nexe server/index.js -t windows-x64-18.0.0 -o wdims.exe
```

**メリット**:
- カスタマイズ性が高い
- Node.jsソースからビルド可能

**デメリット**:
- ビルド時間が非常に長い（初回）
- 複雑な設定が必要な場合がある
- ES Modulesサポートが不完全

**方法4: Tauri（デスクトップアプリ化）** ⭐推奨（本格的なデスクトップアプリ向け）

Webサーバー型ではなく、ネイティブデスクトップアプリとして配布する場合：

```bash
# Rustインストール必須
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauriプロジェクト初期化
npm create tauri-app

# ビルド
npm run tauri build
```

**メリット**:
- 最小バイナリサイズ（600KB～）
- ネイティブアプリライクなUI/UX
- OSネイティブメニュー、トレイアイコン対応
- セキュリティが非常に高い
- クロスプラットフォーム（Win/Mac/Linux + Android/iOS）
- モダンな開発体験

**デメリット**:
- Rust環境のセットアップが必要
- アーキテクチャが異なる（Webサーバー型ではない）
- 学習コストがやや高い

**方法5: Electron（従来型）**

```bash
npm install electron electron-builder

# ビルド
electron-builder --win --mac --linux
```

**メリット**:
- 成熟したエコシステム
- 豊富なドキュメント
- VSCode、Slack等の実績

**デメリット**:
- バイナリサイズが非常に大きい（100MB～）
- メモリ使用量が多い
- Tauriより遅い

---

### 🎯 実行ファイル化の推奨戦略

**フェーズ1: 開発・テスト**
- ローカルサーバー起動（`node server/index.js`）で開発

**フェーズ2: 配布（軽量Webサーバー型）**
- **Node.js SEA**を使用して単一実行ファイル化
- サーバー起動→ブラウザ自動起動の流れ

**フェーズ3: 将来的な拡張（本格的デスクトップアプリ）**
- **Tauri**でネイティブアプリ化
- システムトレイ常駐、ホットキー対応等

**実装例: Node.js SEAビルドスクリプト**

```json
// package.json
{
  "scripts": {
    "build:sea": "node scripts/build-sea.js"
  }
}
```

```javascript
// scripts/build-sea.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. バンドル作成（Viteでクライアントビルド済みと仮定）
console.log('Creating SEA configuration...');
const seaConfig = {
  main: 'server/index.js',
  output: 'sea-prep.blob',
  disableExperimentalSEAWarning: true,
  useCodeCache: true,
  assets: {
    'client': './dist',
    'config': './config'
  }
};
fs.writeFileSync('sea-config.json', JSON.stringify(seaConfig, null, 2));

// 2. Blob生成
console.log('Generating SEA blob...');
execSync('node --experimental-sea-config sea-config.json');

// 3. Node.jsバイナリコピー
console.log('Copying Node.js binary...');
const platform = process.platform;
const ext = platform === 'win32' ? '.exe' : '';
execSync(`cp $(which node) wdims${ext}`);

// 4. Blob注入
console.log('Injecting blob...');
const postjectCmd = platform === 'darwin'
  ? `npx postject wdims NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`
  : `npx postject wdims${ext} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

execSync(postjectCmd);

console.log(`✅ SEA executable created: wdims${ext}`);
```

**クロスプラットフォームビルド**

GitHub Actionsで自動化：

```yaml
# .github/workflows/build.yml
name: Build SEA
on: [push]
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run build:sea
      - uses: actions/upload-artifact@v3
        with:
          name: wdims-${{ matrix.os }}
          path: wdims*
```

### 7. ファイル構成（新規プロジェクト）

```
wdims-local/
├── config/
│   ├── profiles/
│   │   ├── default/
│   │   │   ├── display-settings.json     # 表示設定
│   │   │   └── search-engines.json       # 検索エンジン設定
│   │   ├── development/
│   │   │   ├── display-settings.json
│   │   │   └── search-engines.json
│   │   └── research/
│   │       ├── display-settings.json
│   │       └── search-engines.json
│   ├── browsers.json                     # ブラウザ起動設定（共通）
│   └── active-profile.txt                # アクティブプロファイル名
├── server/
│   ├── index.js                          # メインサーバー（Hono.js）
│   ├── routes/
│   │   ├── profiles.js                   # プロファイルAPI
│   │   └── browsers.js                   # ブラウザ設定API
│   ├── utils/
│   │   ├── profileManager.js             # プロファイル操作ユーティリティ
│   │   ├── fileManager.js                # ファイル操作ユーティリティ
│   │   └── browserLauncher.js            # ブラウザ起動ユーティリティ
│   └── websocket.js                      # WebSocket設定
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProfileSelector.tsx       # プロファイル選択UI
│   │   │   ├── ProfileManager.tsx        # プロファイル管理UI
│   │   │   ├── BrowserSettings.tsx       # ブラウザ設定UI
│   │   │   ├── SearchBox.tsx             # 検索ボックス
│   │   │   ├── SearchResults.tsx         # 検索結果
│   │   │   ├── TabBar.tsx                # タブバー
│   │   │   └── Settings.tsx              # 設定パネル
│   │   ├── services/
│   │   │   ├── api.ts                    # API通信
│   │   │   └── websocket.ts              # WebSocket通信
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── style.css
│   ├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                        # クライアントビルド設定
└── README.md
```

### 8. 実装上の注意点

#### A. 技術制約と回避策

**1. Node.js SEAの制約**

**❌ 使用できないもの**:
- ES Modules形式（import/export）
- 動的require（`require(variable)`）
- ネイティブモジュール（.node）

**✅ 対策**:
```bash
# ESBuildでCommonJSにバンドル
esbuild --bundle --format=cjs --platform=node server/index.ts --outfile=dist/server.js
```

**2. WebSocketライブラリの選定**

**❌ 禁止**: `ws`ライブラリ単体
```javascript
// ❌ これは使わない
import WebSocket from 'ws';
const wss = new WebSocket.Server({ port: 8080 });
```

**✅ 推奨**: Socket.io
```javascript
// ✅ これを使う
import { Server } from 'socket.io';
const io = new Server(httpServer);
```

**理由**: 
- `ws`のオプション依存（`bufferutil`, `utf-8-validate`）はネイティブモジュール
- Node.js SEAでビルドエラーまたは実行時エラーの可能性
- Socket.ioはピュアJavaScriptで完全互換

**3. ファイルアクセスの排他制御**

複数ブラウザからの同時書き込みに対応：

```javascript
const lockfile = require('proper-lockfile');

async function updateProfile(profileName, data) {
  const filePath = `./config/profiles/${profileName}/display-settings.json`;
  const release = await lockfile.lock(filePath);
  
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } finally {
    await release();
  }
}
```

#### B. エラーハンドリング

**1. ファイル操作のエラー処理**

```javascript
// プロファイル読み込み時
async function loadProfile(profileName) {
  try {
    const displaySettings = JSON.parse(
      await fs.readFile(`./config/profiles/${profileName}/display-settings.json`, 'utf8')
    );
    return displaySettings;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合はデフォルト値を返す
      return getDefaultSettings();
    }
    throw error;
  }
}

// JSON解析エラーの処理
try {
  const data = JSON.parse(content);
} catch (error) {
  console.error('Invalid JSON:', error);
  // フォールバック処理
  return getDefaultSettings();
}
```

**2. WebSocket接続エラー処理**

```typescript
// サーバー側
io.on('connection', (socket) => {
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // エラーをクライアントに通知
    socket.emit('error', { message: error.message });
  });
});

// クライアント側
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showNotification('サーバーに接続できません');
});
```

**3. ブラウザ起動エラー処理**

```javascript
function launchBrowser(browserConfig) {
  try {
    exec(`"${browserConfig.path}" ${browserConfig.args.join(' ')} http://localhost:3000`);
  } catch (error) {
    console.error(`Failed to launch ${browserConfig.name}:`, error);
    // エラーは警告のみ、サーバーは起動継続
  }
}
```

#### C. セキュリティ対策

**1. パストラバーサル対策**

```javascript
// プロファイル名のバリデーション
function validateProfileName(name) {
  // ディレクトリトラバーサル攻撃を防ぐ
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid profile name');
  }
  // 英数字とハイフン、アンダースコアのみ許可
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Profile name must contain only alphanumeric characters, hyphens, and underscores');
  }
  return true;
}
```

**2. ローカルホストのみからのアクセス制限**

```javascript
// Hono.js版
app.use('*', async (c, next) => {
  const host = c.req.header('host');
  if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    return c.text('Forbidden', 403);
  }
  await next();
});

// Express版
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});
```

#### D. パフォーマンス最適化

**1. Hono.js最適化設定**

```javascript
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: 3000,
  // デフォルトでtrueだが明示的に指定
  overrideGlobalObjects: true,  // パフォーマンス向上
  autoCleanupIncoming: true     // メモリリーク防止
});
```

**2. Socket.ioメッセージの最適化**

```javascript
// ❌ 悪い例（全データ送信）
socket.emit('update', { allData: largeObject });

// ✅ 良い例（差分のみ送信）
socket.emit('update', { 
  type: 'settings',
  changed: { theme: 'dark' }  // 変更された部分のみ
});
```

**3. デバウンス処理**

```javascript
// 頻繁な更新を防ぐ
import { debounce } from 'lodash-es';

const debouncedUpdate = debounce((settings) => {
  socket.emit('display-settings-update', { profileName, settings });
}, 500);
```

#### E. 開発時のデバッグ

**1. ロギング設定**

```typescript
// Hono.jsはloggerミドルウェア組み込み
import { logger } from 'hono/logger';
app.use('*', logger());

// Socket.ioのデバッグモード
const io = new Server(server, {
  // 開発時のみ有効化
  ...import.meta.env.DEV && { 
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000
  }
});
```

**2. エラー追跡**

```javascript
// グローバルエラーハンドラ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 本番環境ではログファイルに記録
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### 9. マイグレーション計画

既存のworld-dev-info-metasearcherから移行する際の手順：

#### Phase 1: データ構造の準備
1. **既存の設定ファイル形式を維持**
   - `display-settings.json`と`search-engines.json`は元のWeb版と同じ形式
   - ローカルストレージからの移行スクリプトを用意

```javascript
// migration/importFromLocalStorage.js
// ブラウザのローカルストレージからエクスポートした設定を
// プロファイルディレクトリに変換するスクリプト

const fs = require('fs').promises;
const path = require('path');

async function migrateLocalStorage(exportedData, profileName = 'default') {
  const profileDir = path.join(__dirname, '../config/profiles', profileName);
  
  // プロファイルディレクトリ作成
  await fs.mkdir(profileDir, { recursive: true });
  
  // display-settings.json作成
  await fs.writeFile(
    path.join(profileDir, 'display-settings.json'),
    JSON.stringify(exportedData.displaySettings, null, 2)
  );
  
  // search-engines.json作成
  await fs.writeFile(
    path.join(profileDir, 'search-engines.json'),
    JSON.stringify(exportedData.searchEngines, null, 2)
  );
  
  console.log(`✅ Profile "${profileName}" created successfully`);
}

// 使用例
const localStorageExport = {
  displaySettings: { theme: 'dark', gridColumns: 3, showDescriptions: true },
  searchEngines: { tabs: [/* ... */] }
};

migrateLocalStorage(localStorageExport, 'imported-profile');
```

#### Phase 2: コンポーネントの移植
1. **そのまま再利用可能なコンポーネント**:
   - SearchBox
   - SearchResults
   - TabBar
   - SearchEngineCard（検索エンジンカード）

2. **API通信に変更が必要なコンポーネント**:
   - Settings（localStorage → API呼び出し）
   - AddEngineModal（localStorage → API呼び出し）
   - AddTabModal（localStorage → API呼び出し）

3. **新規追加コンポーネント**:
   - ProfileSelector（プロファイル選択）
   - ProfileManager（プロファイル管理）
   - BrowserSettings（ブラウザ起動設定）

#### Phase 3: データアクセス層の書き換え

**Before（Web版 - localStorage）**:
```typescript
// utils/localStorage.ts
export function getDisplaySettings() {
  const stored = localStorage.getItem('wdims-display-settings');
  return stored ? JSON.parse(stored) : defaultSettings;
}

export function saveDisplaySettings(settings) {
  localStorage.setItem('wdims-display-settings', JSON.stringify(settings));
}
```

**After（ローカルサーバー版 - API）**:
```typescript
// services/api.ts
export async function getDisplaySettings(profileName: string) {
  const response = await fetch(`/api/profiles/${profileName}`);
  const data = await response.json();
  return data.displaySettings;
}

export async function saveDisplaySettings(profileName: string, settings: any) {
  await fetch(`/api/profiles/${profileName}/display-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}
```

#### Phase 4: WebSocket統合
```typescript
// services/websocket.ts
import { io } from 'socket.io-client';

const socket = io();

// 設定変更の監視
socket.on('display-settings-changed', ({ profileName, settings }) => {
  if (profileName === currentProfile) {
    // UIを更新
    updateUIWithNewSettings(settings);
  }
});

// 設定変更の送信
export function broadcastDisplaySettingsUpdate(profileName: string, settings: any) {
  socket.emit('display-settings-update', { profileName, settings });
}
```

#### Phase 5: 開発フロー移行

**旧: 単一HTMLビルド**
```bash
npm run build-offline  # dist-offline/index.html生成
```

**新: サーバー + クライアント**
```bash
# 開発時
npm run dev:client    # Vite開発サーバー（5173）
npm run dev:server    # Hono.js開発サーバー（3000）

# 本番ビルド
npm run build:client  # クライアントをdist/にビルド
npm run start         # サーバー起動（dist/を配信）

# SEAビルド
npm run build:sea     # 単一実行ファイル化
```

### 10. 開発フェーズ

**Phase 1: サーバー構築**
- Express + WebSocketサーバー構築
- ファイルベース設定管理実装
- APIエンドポイント実装

**Phase 2: クライアント移植**
- 既存コンポーネントの移植
- localStorage → API呼び出しに変更
- WebSocket接続実装

**Phase 3: 新機能実装**
- プロファイル管理UI
- ブラウザ起動設定UI
- リアルタイム同期機能

**Phase 4: テスト＆最適化**
- 複数ブラウザでの同時アクセステスト
- ファイル書き込み競合テスト
- パフォーマンス最適化

## 使用推奨ライブラリ

### サーバー側（Hono.js構成）⭐推奨
```json
{
  "hono": "^4.0.0",
  "@hono/node-server": "^1.8.0",
  "socket.io": "^4.6.1",
  "proper-lockfile": "^4.1.2",
  "open": "^9.1.0"
}
```

### サーバー側（Express.js構成・代替案）
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.6.1",
  "cors": "^2.8.5",
  "proper-lockfile": "^4.1.2",
  "open": "^9.1.0"
}
```

### クライアント側（Preact継続の場合）
```json
{
  "preact": "^10.19.3",
  "socket.io-client": "^4.6.1",
  "typescript": "^5.3.3",
  "vite": "^5.0.0",
  "@preact/signals": "^1.2.2"
}
```

### 実行ファイル化（Node.js SEA使用時）
```json
{
  "esbuild": "^0.19.0",
  "postject": "^1.0.0-alpha.6"
}
```

### 実行ファイル化（Tauri使用時）
```json
{
  "@tauri-apps/cli": "^2.0.0",
  "@tauri-apps/api": "^2.0.0"
}
```

### ❌ 使用禁止ライブラリ

```json
{
  // ❌ これらは使わない
  "ws": "^8.0.0",              // Node.js SEA非互換
  "bcrypt": "^5.0.0",          // ネイティブモジュール
  "sqlite3": "^5.0.0",         // ネイティブモジュール
  "sharp": "^0.32.0",          // ネイティブモジュール
  "node-gyp": "*"              // ネイティブビルド
}
```

### ✅ 推奨代替ライブラリ

```json
{
  // ✅ これらを使う
  "socket.io": "^4.6.1",           // ws の代わり（SEA互換）
  "bcryptjs": "^2.4.3",            // bcrypt の代わり
  "better-sqlite3": "^9.0.0",      // sqlite3 の代わり（条件付き）
  "jimp": "^0.22.0"                // sharp の代わり
}
```

**注**: Hono.jsを採用する場合、CORS、ロガー、セキュリティヘッダーなどは組み込みミドルウェアとして提供されるため、追加パッケージ不要。

## 実装時のポイント

### WebSocketの効率的な使用
- 全データを毎回送信せず、差分のみを送信
- デバウンス処理でAPIコール頻度を制限
- 接続切断時の自動再接続処理

### プロファイル管理のUX
- 切り替え時のローディング表示
- 変更の保存状態インジケーター（保存中/保存済み）
- 削除時の詳細な確認メッセージ

### ブラウザ起動の堅牢性
- ブラウザパスの自動検出機能
- 起動失敗時のフォールバック処理
- ポート使用中の場合の自動的な別ポート使用

## 今後の拡張可能性

### デスクトップアプリ化
- ✅ **Tauri 2.0でネイティブアプリ化**
  - システムトレイ常駐機能
  - グローバルホットキー対応
  - ネイティブメニュー・通知
  - バイナリサイズ600KB～（超軽量）
  - セキュアなファイルアクセス

### モバイル対応（将来的）
- ✅ **Tauri 2.0でモバイル展開**
  - iOS/Android対応（同じコードベース）
  - React Native Webとの統合
  - Expoとの組み合わせも可能

### 機能拡張
- ✅ プロファイルのインポート/エクスポート（既存機能の拡張）
- ✅ 検索履歴の記録とサジェスト機能
- ✅ タグベースの検索エンジンフィルタリング
- ✅ ダークモード対応（既存機能があれば維持）
- ✅ クラウド同期機能（Dropbox/Google Drive連携）
- ✅ 検索結果プレビュー機能
- ✅ ブックマーク機能

### パフォーマンス最適化
- ✅ 検索エンジン設定のキャッシング
- ✅ WebSocketメッセージの圧縮
- ✅ 仮想スクロール（大量の検索エンジン対応）

## まとめ

本プロジェクトは、既存のブラウザベースメタ検索エンジンを、ローカルサーバー＋ファイルベース設定管理に変更することで、以下を実現する：

### 主要な改善点

1. **設定の永続性**: シークレットモードでも設定が消えない
2. **複数ブラウザ対応**: 異なるブラウザで同じ設定を共有
3. **リアルタイム同期**: 複数ウィンドウ間での即座の設定反映
4. **柔軟なプロファイル管理**: 用途別の設定切り替え
5. **自動ブラウザ起動**: ワンクリックで複数ブラウザ起動

### 推奨技術スタック（2025年版・Node.js SEA互換）

**サーバー側**:
- **Hono.js** (推奨): TypeScript完全対応、軽量・高速、モダンな開発体験
- **Socket.io**: リアルタイム同期（**ws禁止**、SEA互換性のため）
- **理由**: Node.js SEA完全互換、ピュアJavaScript実装

**クライアント側**:
- **Preact**: 既存コード再利用、軽量
- **socket.io-client**: WebSocket通信（自動再接続機能付き）

**実行ファイル化**:
- **Node.js SEA** (推奨): 公式機能、将来性あり
- **Tauri 2.0** (将来的): ネイティブアプリ化、モバイル対応も可能

### ❌ 使用禁止技術（重要）

**絶対に使用してはいけない**:

1. **ws（WebSocketライブラリ）**
   - 理由: ネイティブモジュール依存、Node.js SEA非互換
   - 代替: Socket.io（ピュアJavaScript、完全互換）

2. **ネイティブモジュール全般**
   - bcrypt → bcryptjs
   - sqlite3 → better-sqlite3（条件付き）
   - sharp → jimp

3. **ES Modules形式でのSEAビルド**
   - 対策: ESBuild/RollupでCommonJSにバンドル

4. **動的require**
   - 対策: すべて静的importに変更

### 開発フェーズ別アプローチ

**Phase 1: MVP開発**
- Hono.js + Preact + Socket.io
- ローカル開発環境で動作確認
- TypeScript統合開発

**Phase 2: 配布準備**
- Node.js SEAで単一実行ファイル化
- ESBuildでCommonJSバンドル
- Windows/Mac/Linuxクロスプラットフォームビルド

**Phase 3: 将来的な拡張**
- Tauri 2.0でネイティブデスクトップアプリ化
- システムトレイ常駐、ホットキー対応
- モバイル対応（iOS/Android）

### 技術選定の根拠

この技術スタックは以下の条件を満たすために選定：

✅ **Node.js SEA完全互換** - ネイティブモジュール不使用  
✅ **TypeScript完全対応** - 統一された開発体験  
✅ **軽量・高速** - Expressより高速、バンドルサイズ小  
✅ **本番環境実績** - Hono.js、Socket.io共に実用可能  
✅ **将来性** - 成長中の技術、継続的な開発  
✅ **学習コスト低** - Express経験者なら即座に習得可能

### リスク管理

**低リスク**:
- 小規模・ローカル環境での使用
- 実証済みの技術の組み合わせ
- 代替案（Express）も用意

**中リスク**（許容範囲）:
- Hono.jsは比較的新しい（情報量少）→ ドキュメント充実
- Node.js SEAは実験的機能 → 実用レベルに達している

**リスク軽減策**:
- Socket.io使用でWebSocket制約を完全回避
- ESBuildバンドルでES Modules制約を回避
- ローカルアプリなのでスケーラビリティ問題なし

この技術選定により、効率的な開発、安定した動作、将来的な拡張性、そして**Node.js SEA完全互換性**を両立する。
