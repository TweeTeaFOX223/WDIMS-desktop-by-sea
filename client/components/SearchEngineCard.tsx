import { useState } from "preact/hooks";
import type { SearchEngine } from "../types";

interface SearchEngineCardProps {
  engine: SearchEngine;
  searchUrl: string;
  editMode?: boolean;
  showName?: boolean;
  showDescription?: boolean;
  showUrl?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  draggable?: boolean;
}

export function SearchEngineCard({
  engine,
  searchUrl,
  editMode = false,
  showName = true,
  showDescription = true,
  showUrl = true,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggable = false,
}: SearchEngineCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    setIsDragging(true);
    if (onDragStart) onDragStart(e);
  };

  const handleDragEnd = (e: DragEvent) => {
    setIsDragging(false);
    if (onDragEnd) onDragEnd(e);
  };

  const handleDragOver = (e: DragEvent) => {
    if (editMode) {
      e.preventDefault();
      if (onDragOver) onDragOver(e);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (onDrop) onDrop(e);
  };

  const handleDeleteClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const cardClassName = `search-engine-card ${isDragging ? "dragging" : ""} ${
    editMode ? "edit-mode" : ""
  }`;

  const content = (
    <>
      {editMode && onEdit && (
        <button
          className="card-edit-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          aria-label="編集"
        >
          ✎
        </button>
      )}
      {editMode && onDelete && (
        <button
          className="card-delete-btn"
          onClick={handleDeleteClick}
          aria-label="削除"
        >
          ×
        </button>
      )}
      <div className="search-engine-card-header">
        {engine.icon && (
          <img
            src={engine.icon}
            alt=""
            className="search-engine-icon"
            loading="lazy"
          />
        )}
        {showName && <h3 className="search-engine-name">{engine.name}</h3>}
      </div>
      {showDescription && engine.description && (
        <p className="search-engine-description">{engine.description}</p>
      )}
      {showUrl && (
        <p className="search-engine-url" title={searchUrl}>
          {searchUrl}
        </p>
      )}
      {editMode && (
        <div className="drag-handle" aria-label="ドラッグして移動">
          ☰
        </div>
      )}
    </>
  );

  if (editMode) {
    return (
      <div
        className={cardClassName}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClassName}
      aria-label={`${engine.name}で検索`}
    >
      {content}
    </a>
  );
}
