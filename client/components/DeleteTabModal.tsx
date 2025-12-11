import type { TabConfig } from "../types";

interface DeleteTabModalProps {
  tab: TabConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteTabModal({
  tab,
  onConfirm,
  onCancel,
}: DeleteTabModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content delete-tab-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">タブの削除確認</h2>

        <p className="modal-message">
          このタブには{tab.engines.length}個のサイトが登録されています。
          <br />
          本当に削除しますか?
        </p>

        {tab.engines.length > 0 && (
          <div className="tab-engines-list">
            <h3>登録サイト一覧:</h3>
            <ul>
              {tab.engines.map((engine) => (
                <li key={engine.id}>{engine.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            キャンセル
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
