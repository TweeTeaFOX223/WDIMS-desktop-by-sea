import type { VNode } from "preact";

interface ProfileWarningModalProps {
  profileName: string;
  multipleUiFiles?: boolean;
  multipleEngineFiles?: boolean;
  onClose: () => void;
}

export function ProfileWarningModal({
  profileName,
  multipleUiFiles,
  multipleEngineFiles,
  onClose,
}: ProfileWarningModalProps): VNode {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ プロファイル設定ファイルの警告</h2>
        <div className="modal-body">
          <p>
            プロファイル「<strong>{profileName}</strong>
            」に複数の設定ファイルが検出されました：
          </p>
          <ul style={{ textAlign: "left", marginLeft: "20px" }}>
            {multipleUiFiles && (
              <li>複数の .wdims_ui.json ファイルが存在します</li>
            )}
            {multipleEngineFiles && (
              <li>複数の .wdims_engine.json ファイルが存在します</li>
            )}
          </ul>
          <p>
            最初に見つかったファイルを読み込みました。
            <br />
            正しく動作させるには、各プロファイルフォルダ内に以下のファイルが
            <strong>それぞれ1つずつ</strong>だけ存在するようにしてください：
          </p>
          <ul style={{ textAlign: "left", marginLeft: "20px" }}>
            <li>
              <code>{profileName}.wdims_ui.json</code> - 表示設定
            </li>
            <li>
              <code>{profileName}.wdims_engine.json</code> - 検索エンジン設定
            </li>
          </ul>
          <p style={{ fontSize: "0.9em", color: "#666", marginTop: "15px" }}>
            ※ 拡張子が .wdims_ui.json または .wdims_engine.json
            であれば、任意のファイル名でも読み込まれます。
          </p>
        </div>
        <div className="modal-buttons">
          <button onClick={onClose} className="confirm-button">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
