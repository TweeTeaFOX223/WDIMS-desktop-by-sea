import { useState } from "preact/hooks";
import type { TabConfig } from "../types";

interface TabBarProps {
  tabs: TabConfig[];
  activeTabId: string;
  editMode?: boolean;
  onTabChange: (tabId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onTabDelete?: (tabId: string) => void;
  onTabEdit?: (tabId: string) => void;
  onAddTab?: (position: number) => void;
  onDropEngine?: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  editMode = false,
  onTabChange,
  onTabReorder,
  onTabDelete,
  onTabEdit,
  onAddTab,
  onDropEngine,
}: TabBarProps) {
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [engineDropHoverTabId, setEngineDropHoverTabId] = useState<
    string | null
  >(null);

  const handleDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer!.effectAllowed = "move";
    setDraggedTabIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== index && onTabReorder) {
      onTabReorder(draggedTabIndex, index);
    }
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  const handleEngineDragOver = (e: DragEvent, tabId: string) => {
    // タブ自体がドラッグされている場合は処理しない
    if (draggedTabIndex !== null) {
      return;
    }
    if (editMode && onDropEngine) {
      e.preventDefault();
      e.stopPropagation();
      setEngineDropHoverTabId(tabId);
    }
  };

  const handleEngineDragLeave = () => {
    setEngineDropHoverTabId(null);
  };

  const handleEngineDrop = (e: DragEvent, tabId: string) => {
    // タブ自体がドラッグされている場合は処理しない
    if (draggedTabIndex !== null) {
      return;
    }
    if (editMode && onDropEngine) {
      e.preventDefault();
      e.stopPropagation();
      onDropEngine(tabId);
      setEngineDropHoverTabId(null);
    }
  };

  const handleDeleteClick = (e: Event, tabId: string) => {
    e.stopPropagation();
    if (onTabDelete) {
      onTabDelete(tabId);
    }
  };

  // ドラッグ中の表示用に並び替えた配列を作成
  const displayTabs = [...tabs];
  if (draggedTabIndex !== null && dragOverIndex !== null) {
    const [draggedTab] = displayTabs.splice(draggedTabIndex, 1);
    displayTabs.splice(dragOverIndex, 0, draggedTab);
  }

  return (
    <div className="tab-bar-container">
      <div className="tab-bar" role="tablist" aria-label="検索カテゴリ">
        {displayTabs.map((tab, displayIndex) => {
          const originalIndex = tabs.findIndex((t) => t.id === tab.id);
          const isDragging = draggedTabIndex === originalIndex;

          return (
            <div className="tab-wrapper" key={tab.id}>
              {/* 左側の追加ボタン（全タブ） */}
              {editMode && onAddTab && (
                <button
                  className="add-tab-btn-overlay add-tab-btn-left"
                  onClick={() => onAddTab(displayIndex)}
                  aria-label="この位置にタブを追加"
                >
                  +
                </button>
              )}
              <button
                onClick={() => onTabChange(tab.id)}
                className={`tab-button ${
                  activeTabId === tab.id ? "active" : ""
                } ${isDragging ? "dragging" : ""} ${
                  editMode ? "edit-mode" : ""
                } ${
                  engineDropHoverTabId === tab.id ? "engine-drop-hover" : ""
                }`}
                role="tab"
                aria-selected={activeTabId === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                draggable={editMode}
                onDragStart={(e) =>
                  editMode && handleDragStart(e, originalIndex)
                }
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  if (editMode) {
                    handleDragOver(e, displayIndex);
                    handleEngineDragOver(e, tab.id);
                  }
                }}
                onDragLeave={handleEngineDragLeave}
                onDrop={(e) => {
                  if (editMode) {
                    handleDrop(e, displayIndex);
                    handleEngineDrop(e, tab.id);
                  }
                }}
              >
                {editMode && onTabEdit && (
                  <span
                    className="tab-edit-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTabEdit(tab.id);
                    }}
                    aria-label="編集"
                  >
                    ✎
                  </span>
                )}
                {editMode && onTabDelete && tabs.length > 1 && (
                  <span
                    className="tab-delete-btn"
                    onClick={(e) => handleDeleteClick(e, tab.id)}
                    aria-label="削除"
                  >
                    ×
                  </span>
                )}
                {tab.name}
              </button>
              {/* 右側の追加ボタン（全タブ） */}
              {editMode && onAddTab && (
                <button
                  className="add-tab-btn-overlay add-tab-btn-right"
                  onClick={() => onAddTab(displayIndex + 1)}
                  aria-label="この位置にタブを追加"
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
