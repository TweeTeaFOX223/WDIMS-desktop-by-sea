import { useState, useEffect } from "preact/hooks";
import type { BrowsersConfig } from "../types";
import { getBrowsersConfig, updateBrowsersConfig, launchBrowser, openFolderInExplorer } from "../services/api";

interface BrowserSettingsProps {
  onClose: () => void;
}

export function BrowserSettings({ onClose }: BrowserSettingsProps) {
  const [config, setConfig] = useState<BrowsersConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchingBrowser, setLaunchingBrowser] = useState<string | null>(null);

  // ブラウザ設定を読み込み
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getBrowsersConfig();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError("ブラウザ設定の読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserEnabledChange = (index: number, enabled: boolean) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.browsers[index].enabled = enabled;
    setConfig(newConfig);
  };

  const handleBrowserPathChange = (index: number, path: string) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.browsers[index].path = path;
    setConfig(newConfig);
  };

  const handleBrowserArgsChange = (index: number, args: string) => {
    if (!config) return;
    const newConfig = { ...config };
    // カンマ区切りの文字列を配列に変換
    newConfig.browsers[index].args = args.split(",").map((arg) => arg.trim());
    setConfig(newConfig);
  };

  const handleDefaultPortChange = (port: string) => {
    if (!config) return;
    const portNumber = parseInt(port);
    if (!isNaN(portNumber)) {
      setConfig({ ...config, defaultPort: portNumber });
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await updateBrowsersConfig(config);
      alert("ブラウザ設定を保存しました。サーバーを再起動すると設定が反映されます。");
      setError(null);
    } catch (err) {
      setError("ブラウザ設定の保存に失敗しました");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchBrowser = async (browserName: string) => {
    try {
      setLaunchingBrowser(browserName);
      await launchBrowser(browserName);
      setError(null);
    } catch (err) {
      setError(`${browserName}の起動に失敗しました`);
      console.error(err);
    } finally {
      setLaunchingBrowser(null);
    }
  };

  const handleAddBrowser = () => {
    if (!config) return;
    const newBrowser = {
      name: "新しいブラウザ",
      path: "",
      enabled: false,
      args: [],
    };
    setConfig({
      ...config,
      browsers: [...config.browsers, newBrowser],
    });
  };

  const handleDeleteBrowser = (index: number) => {
    if (!config) return;
    if (
      !confirm(
        `${config.browsers[index].name}を削除しますか？この操作は取り消せません。`
      )
    ) {
      return;
    }
    const newBrowsers = config.browsers.filter((_, i) => i !== index);
    setConfig({
      ...config,
      browsers: newBrowsers,
    });
  };

  const handleBrowserNameChange = (index: number, name: string) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.browsers[index].name = name;
    setConfig(newConfig);
  };

  const handleOpenBrowserFolder = async (browserPath: string) => {
    try {
      // パスからフォルダを抽出
      const folderPath = browserPath.substring(0, browserPath.lastIndexOf("\\"));
      await openFolderInExplorer(folderPath);
    } catch (err) {
      setError("フォルダを開くことができませんでした");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="settings-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2>ブラウザ起動設定</h2>
            <button
              className="settings-close-btn"
              onClick={onClose}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className="settings-content">
            <p>読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="settings-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <h2>ブラウザ起動設定</h2>
            <button
              className="settings-close-btn"
              onClick={onClose}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className="settings-content">
            <p className="error-message">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel browser-settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>ブラウザ起動設定</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {error && <p className="error-message">{error}</p>}

          <div className="settings-info">
            <p>
              📋
              サーバー起動時に自動で開くブラウザを設定できます。設定を変更後、サーバーを再起動すると反映されます。
            </p>
          </div>

          {/* デフォルトポート設定 */}
          <div className="settings-section">
            <h3>デフォルトポート</h3>
            <div className="settings-item">
              <input
                type="number"
                value={config?.defaultPort || 3000}
                onInput={(e) =>
                  handleDefaultPortChange((e.target as HTMLInputElement).value)
                }
                min="1024"
                max="65535"
                className="settings-text-input"
              />
            </div>
            <p className="settings-note">
              サーバーが起動するポート番号を設定します（デフォルト: 3000）
            </p>
          </div>

          {/* ブラウザ一覧 */}
          <div className="settings-section">
            <h3>ブラウザ一覧</h3>
            {config?.browsers.map((browser, index) => {
              const isDefaultBrowser = browser.name === "OSのデフォルトブラウザ";
              return (
                <div key={browser.name} className="browser-item">
                  <div className="browser-header">
                    <label className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={browser.enabled}
                        onChange={(e) =>
                          handleBrowserEnabledChange(
                            index,
                            (e.target as HTMLInputElement).checked
                          )
                        }
                      />
                      <span className="browser-name">{browser.name}</span>
                    </label>
                    <button
                      className="browser-launch-btn"
                      onClick={() => handleLaunchBrowser(browser.name)}
                      disabled={launchingBrowser === browser.name}
                    >
                      {launchingBrowser === browser.name
                        ? "起動中..."
                        : "このブラウザでアプリを開く"}
                    </button>
                  </div>

                  <div className="browser-fields">
                    {isDefaultBrowser && (
                      <div className="settings-note">
                        ℹ️ OSに設定されているデフォルトブラウザで起動します。このエントリは編集できません。
                      </div>
                    )}

                    <div className="form-group">
                      <label>ブラウザ名</label>
                      <input
                        type="text"
                        value={browser.name}
                        onInput={(e) =>
                          handleBrowserNameChange(
                            index,
                            (e.target as HTMLInputElement).value
                          )
                        }
                        className="settings-text-input"
                        placeholder="例: Chrome"
                        disabled={isDefaultBrowser}
                        readOnly={isDefaultBrowser}
                      />
                    </div>

                    <div className="form-group">
                      <label>実行ファイルのパス</label>
                      <input
                        type="text"
                        value={isDefaultBrowser ? "(OSのデフォルト)" : browser.path}
                        onInput={(e) =>
                          handleBrowserPathChange(
                            index,
                            (e.target as HTMLInputElement).value
                          )
                        }
                        className="settings-text-input"
                        placeholder="例: C:\Program Files\Google\Chrome\Application\chrome.exe"
                        disabled={isDefaultBrowser}
                        readOnly={isDefaultBrowser}
                      />
                    </div>

                    <div className="form-group">
                      <label>起動引数（カンマ区切り）</label>
                      <input
                        type="text"
                        value={isDefaultBrowser ? "(なし)" : browser.args.join(", ")}
                        onInput={(e) =>
                          handleBrowserArgsChange(
                            index,
                            (e.target as HTMLInputElement).value
                          )
                        }
                        className="settings-text-input"
                        placeholder="例: --new-window, --incognito"
                        disabled={isDefaultBrowser}
                        readOnly={isDefaultBrowser}
                      />
                    </div>

                    {!isDefaultBrowser && (
                      <div className="browser-actions">
                        <button
                          className="browser-folder-btn"
                          onClick={() => handleOpenBrowserFolder(browser.path)}
                          disabled={!browser.path}
                        >
                          📁 フォルダを開く
                        </button>
                        <button
                          className="browser-delete-btn"
                          onClick={() => handleDeleteBrowser(index)}
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <button className="add-browser-btn" onClick={handleAddBrowser}>
              ➕ ブラウザを追加
            </button>
          </div>

          {/* 保存ボタン */}
          <div className="browser-settings-actions">
            <button
              className="modal-btn modal-btn-confirm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button className="modal-btn modal-btn-cancel" onClick={onClose}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
