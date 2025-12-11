interface ProfileSelectorProps {
  currentProfile: string;
  onProfileChange: (profileName: string) => void;
  onManageProfiles: () => void;
}

export function ProfileSelector({
  currentProfile,
  onProfileChange,
  onManageProfiles,
}: ProfileSelectorProps) {
  console.log(onProfileChange);
  return (
    <div className="profile-selector">
      <button
        className="profile-selector-button"
        onClick={onManageProfiles}
        aria-label="プロファイル管理"
      >
        <span className="profile-icon">👤</span>
        <span className="profile-name">{currentProfile}</span>
      </button>
    </div>
  );
}
