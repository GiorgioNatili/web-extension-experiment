export type BrowserType = 'chrome' | 'firefox' | 'safari';

export interface BrowserInfo {
  type: BrowserType;
  version: string;
  supportsWasm: boolean;
}

export interface ExtensionManifest {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  content_scripts?: any[];
  background?: any;
  web_accessible_resources?: any[];
}
