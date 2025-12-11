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

export interface DisplaySettings {
  theme: "light" | "dark";
  cardScale: number;
  fontSize: number;
  cardsPerRowMode: "fixed" | "auto";
  minCardsPerRow: number;
  showName: boolean;
  showDescription: boolean;
  showUrl: boolean;
}

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

export interface SearchEnginesConfig {
  tabs: TabConfig[];
}

export interface Profile {
  displaySettings: DisplaySettings;
  searchEngines: SearchEnginesConfig;
  warnings?: {
    multipleUiFiles?: boolean;
    multipleEngineFiles?: boolean;
  };
}
