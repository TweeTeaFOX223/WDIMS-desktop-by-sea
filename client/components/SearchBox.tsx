import { useState, useEffect } from "preact/hooks";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function SearchBox({ onSearch, initialQuery = "" }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);

  // initialQueryが変更されたら入力欄も更新
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="search-box" role="search">
      <input
        type="text"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        placeholder="検索キーワードを入力...、空の場合は空検索"
        className="search-input"
        aria-label="検索キーワード"
      />
      <button type="submit" className="search-button" aria-label="検索">
        検索
      </button>
    </form>
  );
}

// **使用方法：**

// HTMLファイルを以下のようなURLで開きます：

// file:///path/to/index.html?q=JavaScript
// file:///path/to/index.html?query=React
// file:///path/to/index.html?word=TypeScript
