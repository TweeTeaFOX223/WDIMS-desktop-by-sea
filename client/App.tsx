import { useState, useEffect } from "preact/hooks";
import type { Config, AppSettings, SearchEngine, TabConfig } from "./types";
import { TabBar } from "./components/TabBar";
import { SearchBox } from "./components/SearchBox";
import { SearchResults } from "./components/SearchResults";
import { ScrollToTop } from "./components/ScrollToTop";
import { Settings } from "./components/Settings";
import { ConfirmModal } from "./components/ConfirmModal";
import { AddEngineModal } from "./components/AddEngineModal";
import { AddTabModal } from "./components/AddTabModal";
import { DeleteTabModal } from "./components/DeleteTabModal";
import { EditEngineModal } from "./components/EditEngineModal";
import { EditTabModal } from "./components/EditTabModal";
import { ProfileSelector } from "./components/ProfileSelector";
import { ProfileManager } from "./components/ProfileManager";
import { BrowserSettings } from "./components/BrowserSettings";
import { ProfileWarningModal } from "./components/ProfileWarningModal";
import { getTabById } from "./utils/searchUtils";
import {
  getActiveProfile,
  getProfile,
  updateDisplaySettings,
  updateSearchEngines,
} from "./services/api";
import {
  initializeWebSocket,
  getSocket,
  onDisplaySettingsChanged,
  onSearchEnginesChanged,
  broadcastDisplaySettingsUpdate,
  broadcastSearchEnginesUpdate,
  closeWebSocket,
} from "./services/websocket";
import { saveActiveProfile, loadActiveProfile } from "./utils/localStorage";
import searchEnginesConfig from "./data/searchEngines.json";

const initialConfig: Config = searchEnginesConfig as Config;

const defaultSettings: AppSettings = {
  theme: "light",
  cardScale: 1.0,
  fontSize: 1.0,
  cardsPerRowMode: "auto",
  minCardsPerRow: 4,
  showName: true,
  showDescription: true,
  showUrl: true,
};

/**
 * URLパラメータから検索クエリを取得
 */
function getQueryFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || params.get("query") || params.get("word") || "";
}

/**
 * URLパラメータからタブIDを取得
 */
function getTabIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") || "";
}

/**
 * URLパラメータを更新
 */
function updateUrlParameter(query: string, tabId: string) {
  const url = new URL(window.location.href);

  // タブIDを設定
  if (tabId) {
    url.searchParams.set("tab", tabId);
  } else {
    url.searchParams.delete("tab");
  }

  // 検索クエリを設定
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  window.history.replaceState({}, "", url.toString());
}

export function App() {
  // アクティブプロファイル名
  const [activeProfileName, setActiveProfileName] = useState<string>("default");

  // プロファイル警告
  const [profileWarnings, setProfileWarnings] = useState<{
    multipleUiFiles?: boolean;
    multipleEngineFiles?: boolean;
  } | null>(null);

  // 設定の状態管理（サーバーから読み込み）
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 検索エンジンの設定（サーバーから読み込み、なければ初期設定）
  const [config, setConfig] = useState<Config>(
    JSON.parse(JSON.stringify(initialConfig))
  );

  // ロード状態
  const [isLoading, setIsLoading] = useState<boolean>(true);
  console.log(isLoading);
  // UI状態
  const [activeTabId, setActiveTabId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showBrowserSettings, setShowBrowserSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    tabId: string;
    engineId: string;
  } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{
    engineId: string;
    sourceTabId: string;
    sourceIndex: number;
  } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  console.log(hoverIndex);

  const [showAddEngineModal, setShowAddEngineModal] = useState(false);
  const [addEnginePosition, setAddEnginePosition] = useState<number>(0);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [addTabPosition, setAddTabPosition] = useState<number>(0);
  const [deleteTabTarget, setDeleteTabTarget] = useState<string | null>(null);
  const [editEngineTarget, setEditEngineTarget] = useState<{
    tabId: string;
    engineId: string;
  } | null>(null);
  const [editTabTarget, setEditTabTarget] = useState<string | null>(null);

  // 初回マウント時にプロファイルをロードし、WebSocket接続を確立
  useEffect(() => {
    const loadProfile = async () => {
      // URLパラメータから検索クエリとタブIDを先に読み取る
      const urlQuery = getQueryFromUrl();
      const urlTabId = getTabIdFromUrl();

      try {
        setIsLoading(true);

        // ローカルストレージから現在のウィンドウのプロファイルを取得
        // なければサーバーのアクティブプロファイルを使用
        let profileName = loadActiveProfile();
        if (!profileName) {
          profileName = await getActiveProfile();
          saveActiveProfile(profileName);
        }
        setActiveProfileName(profileName);

        // プロファイルデータを取得
        const profileData = await getProfile(profileName);
        setSettings(profileData.displaySettings);
        setConfig(profileData.searchEngines);

        // 警告があれば表示
        if (profileData.warnings) {
          setProfileWarnings(profileData.warnings);
        }

        if (urlQuery) {
          setSearchQuery(urlQuery);
        }

        // URLにタブIDがあり、それが有効な場合は設定（優先）
        if (
          urlTabId &&
          profileData.searchEngines.tabs.some((tab) => tab.id === urlTabId)
        ) {
          setActiveTabId(urlTabId);
        } else if (profileData.searchEngines.tabs.length > 0) {
          // URLパラメータがない場合のみ最初のタブを設定
          setActiveTabId(profileData.searchEngines.tabs[0].id);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        // エラー時はデフォルト設定を使用
        setSettings(defaultSettings);
        setConfig(JSON.parse(JSON.stringify(initialConfig)));

        // エラー時もURLパラメータを優先
        if (urlTabId && initialConfig.tabs.some((tab) => tab.id === urlTabId)) {
          setActiveTabId(urlTabId);
        } else if (initialConfig.tabs.length > 0) {
          setActiveTabId(initialConfig.tabs[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();

    // WebSocket接続を初期化
    initializeWebSocket();

    // クリーンアップ時にWebSocket接続を閉じる
    return () => {
      closeWebSocket();
    };
  }, []);

  // WebSocketイベントリスナーを設定
  useEffect(() => {
    // 表示設定が他のクライアントで変更された場合（同じプロファイルの場合のみ）
    const handleDisplaySettingsChanged = ({
      profileName,
      settings: newSettings,
    }: {
      profileName: string;
      settings: AppSettings;
    }) => {
      if (profileName === activeProfileName) {
        setSettings(newSettings);
      }
    };

    // 検索エンジン設定が他のクライアントで変更された場合（同じプロファイルの場合のみ）
    const handleSearchEnginesChanged = ({
      profileName,
      engines,
    }: {
      profileName: string;
      engines: Config;
    }) => {
      if (profileName === activeProfileName) {
        setConfig(engines);
      }
    };

    onDisplaySettingsChanged(handleDisplaySettingsChanged);
    onSearchEnginesChanged(handleSearchEnginesChanged);

    // クリーンアップ: 古いリスナーを削除
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("display-settings-changed", handleDisplaySettingsChanged);
        socket.off("search-engines-changed", handleSearchEnginesChanged);
      }
    };
  }, [activeProfileName]);

  // 検索クエリが変更されたらページタイトルを更新
  useEffect(() => {
    if (searchQuery) {
      document.title = `${searchQuery} - WDIMS メタ検索`;
    } else {
      document.title = "WDIMS メタ検索エンジン";
    }
  }, [searchQuery]);

  // タブIDまたは検索クエリが変更されたらURLを更新
  useEffect(() => {
    // activeTabIdが空の場合（初期化前）はURLを更新しない
    if (activeTabId) {
      updateUrlParameter(searchQuery, activeTabId);
    }
  }, [searchQuery, activeTabId]);

  // テーマ適用
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // カードスケールと文字サイズを適用
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--card-scale",
      settings.cardScale.toString()
    );
    document.documentElement.style.setProperty(
      "--font-scale",
      settings.fontSize.toString()
    );
  }, [settings.cardScale, settings.fontSize]);

  // カード数制御を適用
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--min-cards-per-row",
      settings.minCardsPerRow.toString()
    );
  }, [settings.minCardsPerRow]);

  // カード数モード（固定/オート）を制御
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-cards-mode",
      settings.cardsPerRowMode
    );
  }, [settings.cardsPerRowMode]);

  const activeTab = getTabById(config, activeTabId);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await updateDisplaySettings(activeProfileName, newSettings);
      broadcastDisplaySettingsUpdate(activeProfileName, newSettings);
    } catch (error) {
      console.error("Failed to update display settings:", error);
    }
  };

  const handleSettingsReset = async () => {
    setSettings(defaultSettings);
    try {
      await updateDisplaySettings(activeProfileName, defaultSettings);
      broadcastDisplaySettingsUpdate(activeProfileName, defaultSettings);
    } catch (error) {
      console.error("Failed to reset display settings:", error);
    }
  };

  const handleDeleteRequest = (engineId: string) => {
    setDeleteTarget({ tabId: activeTabId, engineId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const newConfig = { ...config };
    const tabIndex = newConfig.tabs.findIndex(
      (tab) => tab.id === deleteTarget.tabId
    );
    if (tabIndex !== -1) {
      newConfig.tabs[tabIndex] = {
        ...newConfig.tabs[tabIndex],
        engines: newConfig.tabs[tabIndex].engines.filter(
          (e) => e.id !== deleteTarget.engineId
        ),
      };
      setConfig(newConfig);
      try {
        await updateSearchEngines(activeProfileName, newConfig);
        broadcastSearchEnginesUpdate(activeProfileName, newConfig);
      } catch (error) {
        console.error("Failed to delete engine:", error);
      }
    }
    setDeleteTarget(null);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleAddEngineRequest = (position: number) => {
    setAddEnginePosition(position);
    setShowAddEngineModal(true);
  };

  const handleAddEngine = async (engine: SearchEngine) => {
    const newConfig = { ...config };
    const tabIndex = newConfig.tabs.findIndex((tab) => tab.id === activeTabId);
    if (tabIndex !== -1) {
      const engines = [...newConfig.tabs[tabIndex].engines];
      engines.splice(addEnginePosition, 0, engine);
      newConfig.tabs[tabIndex] = {
        ...newConfig.tabs[tabIndex],
        engines,
      };
      setConfig(newConfig);
      try {
        await updateSearchEngines(activeProfileName, newConfig);
        broadcastSearchEnginesUpdate(activeProfileName, newConfig);
      } catch (error) {
        console.error("Failed to add engine:", error);
      }
    }
    setShowAddEngineModal(false);
  };

  const handleAddEngineCancel = () => {
    setShowAddEngineModal(false);
  };

  const handleEditEngineRequest = (tabId: string, engineId: string) => {
    setEditEngineTarget({ tabId, engineId });
  };

  const handleEditEngine = async (
    updatedEngine: SearchEngine,
    newTabId?: string,
    newPosition?: number
  ) => {
    if (!editEngineTarget) return;

    const newConfig = { ...config };
    const sourceTabIndex = newConfig.tabs.findIndex(
      (tab) => tab.id === editEngineTarget.tabId
    );

    if (sourceTabIndex === -1) {
      setEditEngineTarget(null);
      return;
    }

    const engineIndex = newConfig.tabs[sourceTabIndex].engines.findIndex(
      (eng) => eng.id === editEngineTarget.engineId
    );

    if (engineIndex === -1) {
      setEditEngineTarget(null);
      return;
    }

    // タブが変更される場合
    if (newTabId && newTabId !== editEngineTarget.tabId) {
      const targetTabIndex = newConfig.tabs.findIndex(
        (tab) => tab.id === newTabId
      );
      if (targetTabIndex === -1) {
        setEditEngineTarget(null);
        return;
      }

      // ソースタブから削除
      newConfig.tabs[sourceTabIndex].engines = newConfig.tabs[
        sourceTabIndex
      ].engines.filter((_, i) => i !== engineIndex);

      // ターゲットタブに追加（指定された位置に）
      const targetEngines = [...newConfig.tabs[targetTabIndex].engines];
      const insertPosition = newPosition !== undefined ? newPosition : 0;
      targetEngines.splice(insertPosition, 0, updatedEngine);
      newConfig.tabs[targetTabIndex].engines = targetEngines;

      setActiveTabId(newTabId);
    }
    // 同じタブ内で順番のみ変更
    else if (newPosition !== undefined && newPosition !== engineIndex) {
      const engines = [...newConfig.tabs[sourceTabIndex].engines];
      engines.splice(engineIndex, 1);
      engines.splice(newPosition, 0, updatedEngine);
      newConfig.tabs[sourceTabIndex].engines = engines;
    }
    // データのみ更新（位置変更なし）
    else {
      newConfig.tabs[sourceTabIndex].engines[engineIndex] = updatedEngine;
    }

    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to edit engine:", error);
    }

    setEditEngineTarget(null);
  };

  const handleEditEngineCancel = () => {
    setEditEngineTarget(null);
  };

  const handleAddTabRequest = (position: number) => {
    setAddTabPosition(position);
    setShowAddTabModal(true);
  };

  const handleAddTab = async (tab: TabConfig) => {
    const newConfig = { ...config };
    const tabs = [...newConfig.tabs];
    tabs.splice(addTabPosition, 0, tab);
    newConfig.tabs = tabs;
    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to add tab:", error);
    }
    setShowAddTabModal(false);
    setActiveTabId(tab.id);
  };

  const handleAddTabCancel = () => {
    setShowAddTabModal(false);
  };

  const handleDeleteTabRequest = (tabId: string) => {
    setDeleteTabTarget(tabId);
  };

  const handleDeleteTabConfirm = async () => {
    if (!deleteTabTarget) return;

    const newConfig = { ...config };
    newConfig.tabs = newConfig.tabs.filter((tab) => tab.id !== deleteTabTarget);
    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to delete tab:", error);
    }

    // 削除したタブがアクティブだった場合、最初のタブに切り替え
    if (deleteTabTarget === activeTabId && newConfig.tabs.length > 0) {
      setActiveTabId(newConfig.tabs[0].id);
    }

    setDeleteTabTarget(null);
  };

  const handleDeleteTabCancel = () => {
    setDeleteTabTarget(null);
  };

  const handleEditTabRequest = (tabId: string) => {
    setEditTabTarget(tabId);
  };

  const handleEditTab = async (updatedTab: TabConfig) => {
    if (!editTabTarget) return;

    const newConfig = { ...config };
    const tabIndex = newConfig.tabs.findIndex(
      (tab) => tab.id === editTabTarget
    );
    if (tabIndex !== -1) {
      newConfig.tabs[tabIndex] = {
        ...newConfig.tabs[tabIndex],
        name: updatedTab.name,
      };
      setConfig(newConfig);
      try {
        await updateSearchEngines(activeProfileName, newConfig);
        broadcastSearchEnginesUpdate(activeProfileName, newConfig);
      } catch (error) {
        console.error("Failed to edit tab:", error);
      }
    }
    setEditTabTarget(null);
  };

  const handleEditTabCancel = () => {
    setEditTabTarget(null);
  };

  const handleTabReorder = async (fromIndex: number, toIndex: number) => {
    const newConfig = { ...config };
    const tabs = [...newConfig.tabs];
    const [movedTab] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, movedTab);
    newConfig.tabs = tabs;
    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to reorder tabs:", error);
    }
  };

  const handleDragStart = (engineId: string, index: number) => {
    setDraggedItem({ engineId, sourceTabId: activeTabId, sourceIndex: index });
  };

  const handleDragEnd = () => {
    setHoverIndex(null);
  };

  const handleDragOver = (index: number) => {
    if (draggedItem && draggedItem.sourceIndex !== index) {
      setHoverIndex(index);

      // リアルタイムプレビュー：即座に並び替えを適用（ローカルのみ）
      const newConfig = { ...config };
      const sourceTabIndex = newConfig.tabs.findIndex(
        (tab) => tab.id === draggedItem.sourceTabId
      );
      const targetTabIndex = newConfig.tabs.findIndex(
        (tab) => tab.id === activeTabId
      );

      if (sourceTabIndex !== -1 && targetTabIndex !== -1) {
        const draggedEngine =
          newConfig.tabs[sourceTabIndex].engines[draggedItem.sourceIndex];

        if (draggedItem.sourceTabId === activeTabId) {
          // 同じタブ内での移動
          const engines = [...newConfig.tabs[targetTabIndex].engines];
          engines.splice(draggedItem.sourceIndex, 1);
          engines.splice(index, 0, draggedEngine);
          newConfig.tabs[targetTabIndex] = {
            ...newConfig.tabs[targetTabIndex],
            engines,
          };
        } else {
          // 別のタブへの移動
          newConfig.tabs[sourceTabIndex] = {
            ...newConfig.tabs[sourceTabIndex],
            engines: newConfig.tabs[sourceTabIndex].engines.filter(
              (_, i) => i !== draggedItem.sourceIndex
            ),
          };
          const engines = [...newConfig.tabs[targetTabIndex].engines];
          engines.splice(index, 0, draggedEngine);
          newConfig.tabs[targetTabIndex] = {
            ...newConfig.tabs[targetTabIndex],
            engines,
          };
        }

        // ローカル状態のみ更新（API呼び出しはドロップ時に行う）
        setConfig(newConfig);
        // ドラッグ元の情報を更新
        setDraggedItem({
          ...draggedItem,
          sourceTabId: activeTabId,
          sourceIndex: index,
        });
      }
    }
  };

  const handleDrop = async (targetIndex: number) => {
    console.log(targetIndex);
    // ドロップ完了時にサーバーに保存
    if (draggedItem) {
      try {
        await updateSearchEngines(activeProfileName, config);
        broadcastSearchEnginesUpdate(activeProfileName, config);
      } catch (error) {
        console.error("Failed to save reordered engines:", error);
      }
    }
    setDraggedItem(null);
    setHoverIndex(null);
  };

  const handleDropOnTab = async (targetTabId: string) => {
    if (!draggedItem) return;

    const newConfig = { ...config };
    const sourceTabIndex = newConfig.tabs.findIndex(
      (tab) => tab.id === draggedItem.sourceTabId
    );
    const targetTabIndex = newConfig.tabs.findIndex(
      (tab) => tab.id === targetTabId
    );

    if (sourceTabIndex === -1 || targetTabIndex === -1) return;

    // 同じタブへのドロップは無視
    if (draggedItem.sourceTabId === targetTabId) {
      setDraggedItem(null);
      return;
    }

    // ソースから削除して、ターゲットの先頭に追加
    const draggedEngine =
      newConfig.tabs[sourceTabIndex].engines[draggedItem.sourceIndex];
    newConfig.tabs[sourceTabIndex].engines = newConfig.tabs[
      sourceTabIndex
    ].engines.filter((_, i) => i !== draggedItem.sourceIndex);

    const targetEngines = [...newConfig.tabs[targetTabIndex].engines];
    targetEngines.unshift(draggedEngine);
    newConfig.tabs[targetTabIndex].engines = targetEngines;

    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to move engine to tab:", error);
    }

    setDraggedItem(null);
    setActiveTabId(targetTabId);
  };

  const handleConfigImport = async (newConfig: Config) => {
    setConfig(newConfig);
    try {
      await updateSearchEngines(activeProfileName, newConfig);
      broadcastSearchEnginesUpdate(activeProfileName, newConfig);
    } catch (error) {
      console.error("Failed to import config:", error);
    }
    // インポート後は最初のタブに切り替え
    if (newConfig.tabs.length > 0) {
      setActiveTabId(newConfig.tabs[0].id);
    }
  };

  const handleProfileChange = async (profileName: string) => {
    try {
      setIsLoading(true);
      setActiveProfileName(profileName);
      // ローカルストレージに現在のウィンドウのプロファイルを保存
      saveActiveProfile(profileName);
      const profileData = await getProfile(profileName);
      setSettings(profileData.displaySettings);
      setConfig(profileData.searchEngines);

      // 警告があれば表示
      if (profileData.warnings) {
        setProfileWarnings(profileData.warnings);
      }

      if (profileData.searchEngines.tabs.length > 0) {
        setActiveTabId(profileData.searchEngines.tabs[0].id);
      }
    } catch (error) {
      console.error("Failed to switch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageProfiles = () => {
    setShowProfileManager(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title-container">
          {editMode && (
            <div className="edit-mode-overlay">
              編集モード：検索エンジンやタブをドラッグして並び替え、または編集＆削除できます
            </div>
          )}
          <h1 className="app-title">
            World Dev Info Meta Searcher：Desktop by Node.js SEA
          </h1>
          <p className="app-subtitle">
            開発技術＋αの情報収集に使える軽量メタ検索エンジン：デスクトップ版(実行フォルダの中にJSON形式で設定保存)
          </p>
        </div>
        <div className="header-buttons">
          <ProfileSelector
            currentProfile={activeProfileName}
            onProfileChange={handleProfileChange}
            onManageProfiles={handleManageProfiles}
          />
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="設定を開く"
          >
            ⚙️ 設定
          </button>
          <button
            className="settings-btn"
            onClick={() => setShowBrowserSettings(true)}
            aria-label="ブラウザ起動設定を開く"
          >
            🌐 ブラウザ設定
          </button>
          <button
            className={`header-edit-btn ${editMode ? "active" : ""}`}
            onClick={() => setEditMode(!editMode)}
            aria-label={editMode ? "編集モードを終了" : "編集モードを開始"}
          >
            {editMode ? "✓ 完了" : "✏️ 編集"}
          </button>
        </div>
      </header>

      <main className="app-main">
        <SearchBox onSearch={handleSearch} initialQuery={searchQuery} />

        {config.tabs.length === 0 ? (
          <div className="empty-tabs-message">
            <h2>タブがありません</h2>
            <p>新しいタブを作成して、検索エンジンを追加しましょう。</p>
            <button
              className="create-first-tab-btn"
              onClick={() => handleAddTabRequest(0)}
            >
              ＋ 新規タブを作成
            </button>
          </div>
        ) : (
          <>
            <TabBar
              tabs={config.tabs}
              activeTabId={activeTabId}
              editMode={editMode}
              onTabChange={handleTabChange}
              onTabReorder={handleTabReorder}
              onTabDelete={handleDeleteTabRequest}
              onTabEdit={handleEditTabRequest}
              onAddTab={handleAddTabRequest}
              onDropEngine={handleDropOnTab}
            />

            {activeTab && (
              <SearchResults
                query={searchQuery}
                engines={activeTab.engines}
                editMode={editMode}
                showName={settings.showName}
                showDescription={settings.showDescription}
                showUrl={settings.showUrl}
                onDelete={handleDeleteRequest}
                onEdit={(engineId) =>
                  handleEditEngineRequest(activeTabId, engineId)
                }
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onAddEngine={handleAddEngineRequest}
              />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          説明書とコラムとソースコードはこちら |{" "}
          <a
            href="https://github.com/TweeTeaFOX223/WDIMS-desktop-by-sea"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>

      <ScrollToTop
        editMode={editMode}
        onSettingsClick={() => setShowSettings(true)}
        onEditToggle={() => setEditMode(!editMode)}
      />

      {showSettings && (
        <Settings
          settings={settings}
          config={config}
          onSettingsChange={handleSettingsChange}
          onConfigImport={handleConfigImport}
          onClose={() => setShowSettings(false)}
          onReset={handleSettingsReset}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="本当にこの検索エンジンを削除しますか？"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {showAddEngineModal && (
        <AddEngineModal
          onAdd={handleAddEngine}
          onCancel={handleAddEngineCancel}
        />
      )}

      {showAddTabModal && (
        <AddTabModal onAdd={handleAddTab} onCancel={handleAddTabCancel} />
      )}

      {deleteTabTarget &&
        (() => {
          const targetTab = config.tabs.find(
            (tab) => tab.id === deleteTabTarget
          );
          return targetTab ? (
            <DeleteTabModal
              tab={targetTab}
              onConfirm={handleDeleteTabConfirm}
              onCancel={handleDeleteTabCancel}
            />
          ) : null;
        })()}

      {editEngineTarget &&
        (() => {
          const tab = config.tabs.find((t) => t.id === editEngineTarget.tabId);
          const engine = tab?.engines.find(
            (e) => e.id === editEngineTarget.engineId
          );
          const engineIndex = tab?.engines.findIndex(
            (e) => e.id === editEngineTarget.engineId
          );
          return engine && engineIndex !== undefined ? (
            <EditEngineModal
              engine={engine}
              allTabs={config.tabs}
              currentTabId={editEngineTarget.tabId}
              currentPosition={engineIndex}
              onSave={handleEditEngine}
              onCancel={handleEditEngineCancel}
            />
          ) : null;
        })()}

      {editTabTarget &&
        (() => {
          const tab = config.tabs.find((t) => t.id === editTabTarget);
          return tab ? (
            <EditTabModal
              tab={tab}
              onSave={handleEditTab}
              onCancel={handleEditTabCancel}
            />
          ) : null;
        })()}

      {showProfileManager && (
        <ProfileManager
          currentProfile={activeProfileName}
          onClose={() => setShowProfileManager(false)}
          onProfileSwitch={handleProfileChange}
        />
      )}

      {showBrowserSettings && (
        <BrowserSettings onClose={() => setShowBrowserSettings(false)} />
      )}

      {profileWarnings && (
        <ProfileWarningModal
          profileName={activeProfileName}
          multipleUiFiles={profileWarnings.multipleUiFiles}
          multipleEngineFiles={profileWarnings.multipleEngineFiles}
          onClose={() => setProfileWarnings(null)}
        />
      )}
    </div>
  );
}
