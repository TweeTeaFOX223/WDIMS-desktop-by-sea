import { useState, useEffect } from "preact/hooks";
import {
  listProfiles,
  createProfile,
  deleteProfile,
  renameProfile,
  cloneProfile,
  setActiveProfile,
  openFolderInExplorer,
} from "../services/api";
import { ConfirmModal } from "./ConfirmModal";

interface ProfileManagerProps {
  currentProfile: string;
  onClose: () => void;
  onProfileSwitch: (profileName: string) => void;
}

export function ProfileManager({
  currentProfile,
  onClose,
  onProfileSwitch,
}: ProfileManagerProps) {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新規作成
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // 削除
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 名前変更
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // 複製
  const [cloneTarget, setCloneTarget] = useState<string | null>(null);
  const [cloneNewName, setCloneNewName] = useState("");
  const [cloneError, setCloneError] = useState<string | null>(null);

  // プロファイル一覧を読み込み
  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profileList = await listProfiles();
      setProfiles(profileList);
    } catch (err) {
      setError("プロファイル一覧の読み込みに失敗しました");
      console.error("Failed to load profiles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // 新規作成
  const handleCreateClick = () => {
    setNewProfileName("");
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateConfirm = async () => {
    if (!newProfileName.trim()) {
      setCreateError("プロファイル名を入力してください");
      return;
    }

    if (profiles.includes(newProfileName.trim())) {
      setCreateError("このプロファイル名は既に存在します");
      return;
    }

    try {
      await createProfile(newProfileName.trim());
      await loadProfiles();
      setShowCreateModal(false);
      setNewProfileName("");
    } catch (err) {
      setCreateError("プロファイルの作成に失敗しました");
      console.error("Failed to create profile:", err);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateModal(false);
    setNewProfileName("");
    setCreateError(null);
  };

  // 削除
  const handleDeleteClick = (profileName: string) => {
    setDeleteTarget(profileName);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (deleteTarget === currentProfile) {
      alert("現在使用中のプロファイルは削除できません");
      setDeleteTarget(null);
      return;
    }

    if (profiles.length <= 1) {
      alert("最後のプロファイルは削除できません");
      setDeleteTarget(null);
      return;
    }

    try {
      await deleteProfile(deleteTarget);
      await loadProfiles();
      setDeleteTarget(null);
    } catch (err) {
      alert("プロファイルの削除に失敗しました");
      console.error("Failed to delete profile:", err);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  // 名前変更
  const handleRenameClick = (profileName: string) => {
    setRenameTarget(profileName);
    setRenameNewName(profileName);
    setRenameError(null);
  };

  const handleRenameConfirm = async () => {
    if (!renameTarget) return;

    if (!renameNewName.trim()) {
      setRenameError("新しいプロファイル名を入力してください");
      return;
    }

    if (renameNewName.trim() === renameTarget) {
      setRenameTarget(null);
      return;
    }

    if (profiles.includes(renameNewName.trim())) {
      setRenameError("このプロファイル名は既に存在します");
      return;
    }

    try {
      await renameProfile(renameTarget, renameNewName.trim());

      // 現在使用中のプロファイルを変更した場合は切り替え
      if (renameTarget === currentProfile) {
        await setActiveProfile(renameNewName.trim());
        onProfileSwitch(renameNewName.trim());
      }

      await loadProfiles();
      setRenameTarget(null);
      setRenameNewName("");
    } catch (err) {
      setRenameError("プロファイルの名前変更に失敗しました");
      console.error("Failed to rename profile:", err);
    }
  };

  const handleRenameCancel = () => {
    setRenameTarget(null);
    setRenameNewName("");
    setRenameError(null);
  };

  // 複製
  const handleCloneClick = (profileName: string) => {
    setCloneTarget(profileName);
    setCloneNewName(`${profileName}-copy`);
    setCloneError(null);
  };

  const handleCloneConfirm = async () => {
    if (!cloneTarget) return;

    if (!cloneNewName.trim()) {
      setCloneError("新しいプロファイル名を入力してください");
      return;
    }

    if (profiles.includes(cloneNewName.trim())) {
      setCloneError("このプロファイル名は既に存在します");
      return;
    }

    try {
      await cloneProfile(cloneTarget, cloneNewName.trim());
      await loadProfiles();
      setCloneTarget(null);
      setCloneNewName("");
    } catch (err) {
      setCloneError("プロファイルの複製に失敗しました");
      console.error("Failed to clone profile:", err);
    }
  };

  const handleCloneCancel = () => {
    setCloneTarget(null);
    setCloneNewName("");
    setCloneError(null);
  };

  // プロファイル切り替え
  const handleSwitchProfile = async (profileName: string) => {
    if (profileName === currentProfile) return;

    try {
      await setActiveProfile(profileName);
      onProfileSwitch(profileName);
      onClose();
    } catch (err) {
      alert("プロファイルの切り替えに失敗しました");
      console.error("Failed to switch profile:", err);
    }
  };

  // エクスプローラーでフォルダを開く
  const handleOpenProfileFolder = async (profileName: string) => {
    try {
      const folderPath = `config\\profiles\\${profileName}`;
      await openFolderInExplorer(folderPath);
    } catch (err) {
      alert("フォルダを開くことができませんでした");
      console.error("Failed to open folder:", err);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel profile-manager" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>プロファイル管理</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="profile-manager-content">
          {isLoading && (
            <div className="profile-loading">読み込み中...</div>
          )}

          {error && (
            <div className="profile-error">{error}</div>
          )}

          {!isLoading && !error && (
            <>
              <div className="profile-manager-header">
                <p className="profile-manager-desc">
                  プロファイルを使用して、複数の設定を切り替えることができます。
                </p>
                <button
                  className="profile-create-btn"
                  onClick={handleCreateClick}
                >
                  ➕ 新規プロファイル作成
                </button>
              </div>

              <div className="profile-list">
                {profiles.map((profile) => (
                  <div
                    key={profile}
                    className={`profile-item ${
                      profile === currentProfile ? "active" : ""
                    }`}
                  >
                    <div className="profile-item-main">
                      <div className="profile-item-info">
                        <span className="profile-item-icon">👤</span>
                        <span className="profile-item-name">{profile}</span>
                        {profile === currentProfile && (
                          <span className="profile-current-badge">使用中</span>
                        )}
                      </div>
                      <div className="profile-item-actions">
                        {profile !== currentProfile && (
                          <button
                            className="profile-action-btn profile-switch-btn"
                            onClick={() => handleSwitchProfile(profile)}
                            title="このプロファイルに切り替え"
                          >
                            切り替え
                          </button>
                        )}
                        <button
                          className="profile-action-btn"
                          onClick={() => handleOpenProfileFolder(profile)}
                          title="エクスプローラーでフォルダを開く"
                        >
                          📁
                        </button>
                        <button
                          className="profile-action-btn"
                          onClick={() => handleCloneClick(profile)}
                          title="このプロファイルを複製"
                        >
                          📋
                        </button>
                        <button
                          className="profile-action-btn"
                          onClick={() => handleRenameClick(profile)}
                          title="このプロファイルの名前を変更"
                        >
                          ✏️
                        </button>
                        <button
                          className="profile-action-btn profile-delete-btn-icon"
                          onClick={() => handleDeleteClick(profile)}
                          title="このプロファイルを削除"
                          disabled={profiles.length <= 1}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 新規作成モーダル */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>新規プロファイル作成</h3>
              <div className="modal-input-group">
                <label>プロファイル名</label>
                <input
                  type="text"
                  value={newProfileName}
                  onInput={(e) => setNewProfileName((e.target as HTMLInputElement).value)}
                  placeholder="例: work"
                  autoFocus
                />
                {createError && (
                  <p className="modal-error">{createError}</p>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={handleCreateConfirm} className="modal-btn-primary">
                  作成
                </button>
                <button onClick={handleCreateCancel} className="modal-btn-secondary">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <ConfirmModal
            message={`プロファイル「${deleteTarget}」を削除しますか？この操作は取り消せません。`}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}

        {/* 名前変更モーダル */}
        {renameTarget && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>プロファイル名変更</h3>
              <div className="modal-input-group">
                <label>現在の名前: {renameTarget}</label>
                <input
                  type="text"
                  value={renameNewName}
                  onInput={(e) => setRenameNewName((e.target as HTMLInputElement).value)}
                  placeholder="新しい名前"
                  autoFocus
                />
                {renameError && (
                  <p className="modal-error">{renameError}</p>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={handleRenameConfirm} className="modal-btn-primary">
                  変更
                </button>
                <button onClick={handleRenameCancel} className="modal-btn-secondary">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 複製モーダル */}
        {cloneTarget && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>プロファイル複製</h3>
              <div className="modal-input-group">
                <label>複製元: {cloneTarget}</label>
                <input
                  type="text"
                  value={cloneNewName}
                  onInput={(e) => setCloneNewName((e.target as HTMLInputElement).value)}
                  placeholder="新しいプロファイル名"
                  autoFocus
                />
                {cloneError && (
                  <p className="modal-error">{cloneError}</p>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={handleCloneConfirm} className="modal-btn-primary">
                  複製
                </button>
                <button onClick={handleCloneCancel} className="modal-btn-secondary">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
