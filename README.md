# WDIMS-desktop-by-sea  
![screenshot](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot.png)  
![screenshot2](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot2.png)  
![screenshot3](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot3.png)  
↓はWeb版と同じ部分。
![screenshot3A](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot3A.png)  
![screenshot3B](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot3B.png)  

![screenshot4](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot4.png)  

<br>
  
## アプリの概要 
[World Dev Info Meta Searcher（WDIMS）](https://github.com/TweeTeaFOX223/world-dev-info-metasearcher)のデスクトップ版です。  名前は「World Dev Info Meta Searcher：Desktop by Node.js SEA」。短くすると「WDIMS:D-SEA」です。
  
お手元のPCにアプリをダウンロードして実行する形式になっています。プライバシーを重視する方、お手元で設定管理したい方にオススメな仕様になっています。実行ファイルのサイズは80MB程度です。    
  
<br>
  
### Web版に無い機能
基本的な機能の説明はWeb版の方のREADMEを見てください。  
https://github.com/TweeTeaFOX223/world-dev-info-metasearcher  
  
<br>
  
**これ(デスクトップ版)で追加された機能の一覧**  
- ブラウザのローカルストレージではなく、PC内のフォルダにJSON形式でプロファイル(設定ファイル)を保存する形式に変更されています。
  - 異なるブラウザから同じ設定を使用することができます。  
  - 手動でJSONファイル削除をしない限り、検索設定が絶対に消えません。  
  - Web版と違いGitHubに検索内容が残る可能性が一切ありません。  
  
- 複数のプロファイルを切り替える機能があります。
  -  「表示設定」と「検索エンジン設定」のセットを名前付きで管理、切り替えることができます。
  -  プロファイルの削除と複製、新規プロファイルの作成をUI上で行うことが可能です。
  
- Web Socket(Socket.IO)による「設定変更を異なるブラウザ間でリアルタイム同期する機能」があります。
  - 複数のウィンドウで、あるプロファイルを同時に使用している場合、「ウィンドウAでプロファイル1の検索エンジン設定を編集」→「ウィンドウBの方にも即座に反映される」という仕様になっています。  
  
- アプリ起動時にローカルホストにアクセスするブラウザを指定しておくことが可能です。  
  - 手動でPC内のブラウザのパス＋実行引数を書くことで設定できます。  
  - ブラウザのシークレットモードでアプリを使用したい場合に便利です。  
  
<br>
  

## ★このアプリを使用する方法！
### GitHubのReleaseからダウンロード
  
配布はWindowsのみに対応です。GitHubのReleaseからzipファイルをダウンロードして解凍、フォルダの中に入っている`wdims.exe`を実行すると動きます。  
**https://github.com/TweeTeaFOX223/WDIMS-desktop-by-sea/releases**  
  
`wdims.exe`を実行するとこのようなコンソールのウィンドウが出ます。これが出ている状態で適当なブラウザから `http://localhost:3000` にアクセスすることでアプリを使用できます。ウィンドウがアプリの本体なので、これを閉じるとアプリが終了します。  
![screenshot6](https://raw.githubusercontent.com/TweeTeaFOX223/WDIMS-desktop-by-sea/refs/heads/main/ScreenShot6.png)  
  
<br>
  
## 技術関係の説明  

### 技術項目の表  
  
| 技術項目                     | 使用しているもの                            |
| ---------------------------- | ------------------------------------------- |
| AI エージェント              | Claude Code（Sonnet 4.5）                   |
| プログラミング言語           | TypeScript                                  |
| フロントエンドフレームワーク | Preact                                      |
| バックエンドフレームワーク   | Hono.js                                     |
| 型安全なAPI通信              | Hono RPC                                    |
| ランタイムバリデーション     | Zod                                         |
| リアルタイム通信             | Socket.IO                                   |
| CSS                          | 通常のCSS                                   |
| パッケージ管理とタスク処理   | npm                                         |
| ビルドツール                 | Vite (Rolldown)                             |
| exeファイル化                | Node.js SEA (Single Executable Application) |
  

### TypeScriptだけでデスクトップアプリ

#### Node.js SEAとElectronとTauri
- 「TypeScriptだけでローカルホストにアクセスして起動するタイプのデスクトップアプリを作る実験」という側面が強いアプリです。「クライアント：Preact」＋「サーバー：Hono.js(RPC使用)」＋「リアルタイム同期：Socket.IO」＋「exeファイル化：Node.js SEA」という実験的なスタックで作成されています。このスタックの採用例があるか探したけど見つけられなかったのでおそらく初だと思います。    
  
-  Electronは、「Node.jsとChromiumを両方含む関係でバイナリサイズが大きくなる」、「普段遣いのブラウザ上で使用するアプリなので、Chromiumの機能が不要」ということで、今回は採用しませんでした。このアプリもSEAのビルドでNode.jsを丸ごと含む関係で80MB程度になっているので、あまり変わらないかもしれない…？  
  
- Tauriは、バイナリサイズが小さい（10MB未満？）＋人気で情報量多く安定ですが、TypeScriptに加えてRustの理解も必要になるので採用しませんでした。大体の部分を作り終わった後に見ましたが、「[TypeScriptだけ書くのでもデスクトップアプリを十分作れる](https://zenn.dev/tris/articles/tskaigi2025-tauri-with-only-ts)」という情報もあるらしいので、このアプリと全く同じ機能を持つTauri版も作るかもしれないです。 

### GitHub ActionsによるRelease用成果物の真正性の証明
#### Artifact AttestationsとImmutable Release
ソースコードのビルドとzipファイルのリリースに、GitHub ActionsのArtifact AttestationsとImmutable Release機能を使っているので、「プロジェクトのコードをビルドして生成されたもの」という保証付きです。各リリースを見てみると「🔏 Immutable」の鍵マークが付いているはず。    

詳細はGitHub Actionsのymlファイルを見てください。  
https://github.com/TweeTeaFOX223/WDIMS-desktop-by-sea/blob/main/.github/workflows/release.yml  

  
GitHub公式：Artifact Attestations(成果物構成証明)  
https://docs.github.com/ja/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations  
GitHub公式：Immutable Release(変更不可リリース)  
https://docs.github.com/ja/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases  
  

<br>
  
## READMEの目次
- [WDIMS-desktop-by-sea](#wdims-desktop-by-sea)
  - [アプリの概要](#アプリの概要)
    - [Web版に無い機能](#web版に無い機能)
  - [★このアプリを使用する方法！](#このアプリを使用する方法)
    - [GitHubのReleaseからダウンロード](#githubのreleaseからダウンロード)
  - [技術関係の説明](#技術関係の説明)
    - [技術項目の表](#技術項目の表)
    - [TypeScriptだけでデスクトップアプリ](#typescriptだけでデスクトップアプリ)
      - [Node.js SEAとElectronとTauri](#nodejs-seaとelectronとtauri)
    - [GitHub ActionsによるRelease用成果物の真正性の証明](#github-actionsによるrelease用成果物の真正性の証明)
      - [Artifact AttestationsとImmutable Release](#artifact-attestationsとimmutable-release)
  - [READMEの目次](#readmeの目次)
  - [アプリの動作＆改変方法](#アプリの動作改変方法)
    - [［0］:インストールが必要なもの](#0インストールが必要なもの)
    - [［1］：リポジトリをクローン](#1リポジトリをクローン)
    - [［2］：依存関係をインストール](#2依存関係をインストール)
    - [［3A］：そのままアプリを起動](#3aそのままアプリを起動)
    - [［3B］：Node.js SEAでアプリをexeにビルド](#3bnodejs-seaでアプリをexeにビルド)
    - [プロファイル初期設定のカスタム方法](#プロファイル初期設定のカスタム方法)
  - [プロジェクトのファイル構成](#プロジェクトのファイル構成)
  - [ライセンス](#ライセンス)
  
<br>
  
## アプリの動作＆改変方法
  
### ［0］:インストールが必要なもの
  
これらのインストールが必須です。node.jsの公式サイトからDLできます。一番新しいLTSのやつを使えば多分動きます。
https://nodejs.org/ja/download
  
| 事前インストールが必要 | 動作確認したver |
| ---------------------- | --------------- |
| npm                    | v11.7.0         |
| node.js                | v25.2.1        |

### ［1］：リポジトリをクローン
ファイルを入れたいディレクトでリポジトリをクローンし、cdでディレクトリに入ってください。gitがない場合はZIPでダウンロードして解凍してください。
```
git clone https://github.com/TweeTeaFOX223/WDIMS-desktop-by-sea.git
cd WDIMS-desktop-by-sea 
```
### ［2］：依存関係をインストール
npmで以下のコマンドを実行してください。
```bash
# 依存関係のインストール
npm install
```

### ［3A］：そのままアプリを起動
開発用のやつです。そのままアプリを起動します。起動した状態で設定を変更すると`config\profiles`にJSONで保存されます。  

```bash
npm run start

# 下のやつを一気にやるコマンドです。
# １：dist にクライアントのファイルをビルド
# ２：バックエンドでサーバー(Hono.js)を起動
# ３：http://localhost:3000 に適当なブラウザでアクセスするとアプリ動く
```
  
### ［3B］：Node.js SEAでアプリをexeにビルド
GitHub Releaseでバイナリとして配布する用のやつです。
```bash
npm run build:sea

# アプリを起動する用のexeをビルドするコマンドです。
# WDIMS_desktopに配布用のフォルダが作成されます。
# WDIMS_desktop_win32_x64.zipに↑を圧縮したやつが生成されます。
```
  
### プロファイル初期設定のカスタム方法

`config\profiles` を編集して、デフォルトのプロファイルを編集できます。Node.js SEAでビルドしたやつの初期設定もこれと同じになります。    
  
`npm run start`でアプリを実際に起動してUI上で編集をした方が早いです。  
  
<br>
  

## プロジェクトのファイル構成

```
├── ClaudeCode用
│   ├── IMPLEMENTATION_CHECKLIST.md      # 実装チェックリスト
│   └── WDIMS_LocalServer_Requirements.md # プロジェクト要件定義書
├── LICENSE                               # ライセンスファイル
├── README.md                             # プロジェクト説明書
├── client                                # フロントエンド（Preact）
│   ├── App.tsx                          # メインアプリケーションコンポーネント
│   ├── components                       # UIコンポーネント群
│   │   ├── AddEngineModal.tsx          # 検索エンジン追加モーダル
│   │   ├── AddTabModal.tsx             # タブ追加モーダル
│   │   ├── BrowserSettings.tsx         # ブラウザ設定コンポーネント
│   │   ├── ConfirmModal.tsx            # 確認ダイアログ
│   │   ├── DeleteTabModal.tsx          # タブ削除確認モーダル
│   │   ├── EditEngineModal.tsx         # 検索エンジン編集モーダル
│   │   ├── EditTabModal.tsx            # タブ編集モーダル
│   │   ├── ProfileManager.tsx          # プロファイル管理画面
│   │   ├── ProfileSelector.tsx         # プロファイル選択UI
│   │   ├── ProfileWarningModal.tsx     # プロファイル警告表示モーダル
│   │   ├── ScrollToTop.tsx             # トップスクロールボタン
│   │   ├── SearchBox.tsx               # 検索ボックス
│   │   ├── SearchEngineCard.tsx        # 検索エンジンカード表示
│   │   ├── SearchResults.tsx           # 検索結果表示エリア
│   │   ├── Settings.tsx                # 設定画面
│   │   └── TabBar.tsx                  # タブバー
│   ├── data
│   │   └── searchEngines.json          # デフォルト検索エンジンデータ
│   ├── index.html                       # HTMLエントリーポイント
│   ├── lib
│   │   └── hono-client.ts              # Hono RPCクライアント初期化
│   ├── main.tsx                         # アプリケーションエントリーポイント
│   ├── services
│   │   ├── api.ts                      # API通信サービス（Hono RPC）
│   │   └── websocket.ts                # WebSocket通信サービス（Socket.IO）
│   ├── style.css                        # スタイルシート
│   ├── types
│   │   └── index.ts                    # TypeScript型定義（クライアント）
│   └── utils
│       ├── localStorage.ts             # LocalStorage操作ユーティリティ
│       └── searchUtils.ts              # 検索関連ユーティリティ
├── config                                # 設定ファイル格納ディレクトリ
│   ├── active-profile.txt               # アクティブプロファイル名
│   ├── browsers.json                    # ブラウザ設定
│   └── profiles                         # プロファイルディレクトリ
│       └── default                      # デフォルトプロファイル
│           ├── default.wdims_engine.json # 検索エンジン設定
│           └── default.wdims_ui.json    # UI表示設定
├── config_sample                         # 設定ファイルサンプル
│   ├── wdis-display-settings.wdims_ui.json    # UI設定サンプル
│   └── wdis-search-engines.wdims_engine.json  # 検索エンジン設定サンプル
├── dist                                  # ビルド成果物（Vite）
│   ├── assets
│   │   ├── index-C7_bPw_9.css          # ビルド済みCSS
│   │   └── index-DzIGUo4n.js           # ビルド済みJS
│   └── index.html                       # ビルド済みHTML
├── eslint.config.ts                      # ESLint設定
├── package-lock.json                     # npm依存関係ロックファイル
├── package.json                          # npmパッケージ設定
├── scripts                               # ビルド・ユーティリティスクリプト
│   ├── build-sea.ts                     # Node.js SEAビルドスクリプト
│   ├── generateMarkdownTable.ts         # Markdown表生成スクリプト
│   └── migrate-profile-files.ts         # プロファイルファイル移行スクリプト
├── search-engines-table.md               # 検索エンジン一覧表
├── server                                # バックエンド（Hono.js）
│   ├── dist                             # サーバービルド成果物
│   │   ├── index.js                    # メインサーバーコード
│   │   ├── types
│   │   │   └── index.js                # 型定義ビルド済み
│   │   ├── utils
│   │   │   ├── browserLauncher.js      # ブラウザ起動ユーティリティ
│   │   │   └── profileManager.js       # プロファイル管理ユーティリティ
│   │   └── websocket.js                # WebSocketサーバー
│   ├── index.ts                         # サーバーエントリーポイント
│   ├── routes.ts                        # APIルート定義（Hono RPC）
│   ├── schemas.ts                       # Zodバリデーションスキーマ
│   ├── types
│   │   └── index.ts                    # TypeScript型定義（サーバー）
│   ├── utils
│   │   ├── browserLauncher.ts          # ブラウザ起動処理
│   │   └── profileManager.ts           # プロファイルCRUD操作
│   └── websocket.ts                     # Socket.IO設定
├── tsconfig.app.json                     # TypeScript設定（アプリケーション）
├── tsconfig.json                         # TypeScript基本設定
├── tsconfig.node.json                    # TypeScript設定（Node.js用）
└── vite.config.ts                        # Vite設定

```
  
<br>
  
## ライセンス  
  
「MIT License」です。