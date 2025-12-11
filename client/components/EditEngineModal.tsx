import { useState, useEffect } from "preact/hooks";
import type { SearchEngine, TabConfig } from "../types";

interface EditEngineModalProps {
  engine: SearchEngine;
  allTabs: TabConfig[];
  currentTabId: string;
  currentPosition: number;
  onSave: (engine: SearchEngine, newTabId?: string, newPosition?: number) => void;
  onCancel: () => void;
}

export function EditEngineModal({
  engine,
  allTabs,
  currentTabId,
  currentPosition,
  onSave,
  onCancel,
}: EditEngineModalProps) {
  const [name, setName] = useState(engine.name);
  const [url, setUrl] = useState(engine.url);
  const [icon, setIcon] = useState(engine.icon || "");
  const [description, setDescription] = useState(engine.description || "");
  const [selectedTabId, setSelectedTabId] = useState(currentTabId);
  const [position, setPosition] = useState(currentPosition);

  // タブが変更されたら順番を0にリセット
  useEffect(() => {
    if (selectedTabId !== currentTabId) {
      setPosition(0);
    }
  }, [selectedTabId, currentTabId]);

  // 選択されたタブの検索エンジン数を取得
  const selectedTab = allTabs.find((tab) => tab.id === selectedTabId);
  const isSameTab = selectedTabId === currentTabId;

  // maxPositionの計算
  // 同じタブ内の場合: 自分を除いた数 - 1 (最小0)
  // 別タブへの移動: 移動先のエンジン数 (自分が追加される)
  const maxPosition = selectedTab
    ? isSameTab
      ? Math.max(0, selectedTab.engines.length - 1)
      : selectedTab.engines.length
    : 0;

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      alert("名前とURLは必須です");
      return;
    }

    const updatedEngine: SearchEngine = {
      ...engine,
      name: name.trim(),
      url: url.trim(),
      icon: icon.trim() || undefined,
      description: description.trim() || undefined,
    };

    // タブが変更された、または順番が変更された場合は追加情報を渡す
    if (selectedTabId !== currentTabId || position !== currentPosition) {
      onSave(updatedEngine, selectedTabId, position);
    } else {
      onSave(updatedEngine);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content add-engine-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">検索エンジンを編集</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="engine-name">
              名前 <span className="required">*</span>
            </label>
            <input
              id="engine-name"
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="例: Google"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="engine-url">
              検索URL <span className="required">*</span>
            </label>
            <input
              id="engine-url"
              type="text"
              value={url}
              onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
              placeholder="例: https://www.google.com/search?q={query}"
              className="form-input"
              required
            />
            <p className="form-hint">
              ※検索URLの単語の部分を{"{query}"}に置き換えて入力
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="engine-icon">アイコンURL</label>
            <input
              id="engine-icon"
              type="text"
              value={icon}
              onInput={(e) => setIcon((e.target as HTMLInputElement).value)}
              placeholder="例: https://example.com/icon.png"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="engine-description">説明</label>
            <textarea
              id="engine-description"
              value={description}
              onInput={(e) =>
                setDescription((e.target as HTMLTextAreaElement).value)
              }
              placeholder="検索エンジンの説明を入力"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="engine-tab">所属タブ</label>
            <select
              id="engine-tab"
              value={selectedTabId}
              onChange={(e) =>
                setSelectedTabId((e.target as HTMLSelectElement).value)
              }
              className="form-input"
            >
              {allTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="engine-position">
              表示順番：{position + 1}番目 / {maxPosition + 1}個中
              {!isSameTab && (
                <span>
                  （移動後）
                  {maxPosition === 0 && "（移動後は1個のみ）"}
                </span>
              )}
            </label>
            <input
              id="engine-position"
              type="range"
              min="0"
              max={maxPosition}
              value={position}
              onInput={(e) =>
                setPosition(Number((e.target as HTMLInputElement).value))
              }
              className="form-range"
            />
          </div>

          <div className="modal-buttons">
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={onCancel}
            >
              キャンセル
            </button>
            <button type="submit" className="modal-btn modal-btn-confirm">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
