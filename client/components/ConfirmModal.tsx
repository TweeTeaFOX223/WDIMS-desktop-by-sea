interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <p className="modal-message">{message}</p>
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
