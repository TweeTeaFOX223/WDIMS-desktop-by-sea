import { useState } from "preact/hooks";
import type { TabConfig } from "../types";

interface EditTabModalProps {
  tab: TabConfig;
  onSave: (tab: TabConfig) => void;
  onCancel: () => void;
}

export function EditTabModal({ tab, onSave, onCancel }: EditTabModalProps) {
  const [name, setName] = useState(tab.name);

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("タブ名は必須です");
      return;
    }

    const updatedTab: TabConfig = {
      ...tab,
      name: name.trim(),
    };

    onSave(updatedTab);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content add-tab-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">タブを編集</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tab-name">
              タブ名 <span className="required">*</span>
            </label>
            <input
              id="tab-name"
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="例: AI・機械学習"
              className="form-input"
              required
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
