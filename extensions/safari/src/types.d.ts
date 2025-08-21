// Safari extension type declarations

declare const browser: {
  runtime: {
    getURL: (path: string) => string;
    sendMessage: (message: any) => Promise<any>;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
    };
    onInstalled: {
      addListener: (callback: (details: any) => void) => void;
    };
    onStartup: {
      addListener: (callback: () => void) => void;
    };
    onUpdateAvailable: {
      addListener: (callback: (details: any) => void) => void;
    };
    openOptionsPage: () => void;
    reload: () => void;
  };
  storage: {
    local: {
      get: (keys: string[]) => Promise<any>;
      set: (data: any) => Promise<void>;
    };
  };
  tabs: {
    create: (options: any) => Promise<any>;
    query: (queryInfo: any) => Promise<any[]>;
    sendMessage: (tabId: number, message: any) => Promise<any>;
  };
};

declare const window: {
  postMessage: (message: any, targetOrigin: string) => void;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
} & typeof globalThis;

declare const document: {
  getElementById: (id: string) => HTMLElement | null;
  createElement: (tagName: string) => HTMLElement;
  querySelectorAll: (selector: string) => NodeListOf<Element>;
  addEventListener: (type: string, listener: EventListener) => void;
  body: HTMLElement;
  readyState: string;
} & typeof globalThis;

declare const HTMLElement: {
  new(): HTMLElement;
  prototype: HTMLElement;
} & typeof globalThis;

declare const EventListener: (event: Event) => void;

declare const Event: {
  new(type: string): Event;
  prototype: Event;
} & typeof globalThis;

declare const NodeListOf: <T extends Node>() => NodeListOf<T>;

declare const Node: {
  new(): Node;
  prototype: Node;
  ELEMENT_NODE: number;
} & typeof globalThis;

declare const Element: {
  new(): Element;
  prototype: Element;
  querySelectorAll: (selector: string) => NodeListOf<Element>;
} & typeof globalThis;

