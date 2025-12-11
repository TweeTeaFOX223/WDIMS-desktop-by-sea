import { useState, useEffect } from "preact/hooks";

interface ScrollToTopProps {
  editMode: boolean;
  onSettingsClick: () => void;
  onEditToggle: () => void;
}

export function ScrollToTop({
  editMode,
  onSettingsClick,
  onEditToggle,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  // スクロール位置を監視
  useEffect(() => {
    const handleScroll = () => {
      // 300px以上スクロールしたらボタンを表示
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="floating-buttons">
      <button
        className="floating-btn settings-floating-btn"
        onClick={onSettingsClick}
        aria-label="設定を開く"
      >
        ⚙️
      </button>
      <button
        className={`floating-btn edit-floating-btn ${editMode ? "active" : ""}`}
        onClick={onEditToggle}
        aria-label={editMode ? "編集モードを終了" : "編集モードを開始"}
      >
        {editMode ? "✓" : "✏️"}
      </button>
      <button
        className="floating-btn scroll-to-top"
        onClick={scrollToTop}
        aria-label="ページトップへ戻る"
      >
        ↑
      </button>
    </div>
  );
}
