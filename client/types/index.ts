export interface SearchEngine {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
}

export interface TabConfig {
  id: string;
  name: string;
  engines: SearchEngine[];
}

export interface Config {
  tabs: TabConfig[];
}

export interface AppSettings {
  theme: "light" | "dark";
  cardScale: number;
  fontSize: number;
  cardsPerRowMode: "fixed" | "auto";
  minCardsPerRow: number;
  showName: boolean;
  showDescription: boolean;
  showUrl: boolean;
}

export interface DragItem {
  engineId: string;
  sourceTabId: string;
  index: number;
}

export interface Browser {
  name: string;
  path: string;
  enabled: boolean;
  args: string[];
}

export interface BrowsersConfig {
  browsers: Browser[];
  defaultPort: number;
}

export interface Profile {
  displaySettings: AppSettings;
  searchEngines: Config;
  warnings?: {
    multipleUiFiles?: boolean;
    multipleEngineFiles?: boolean;
  };
}
