import { BrowserType } from '../types/browser';

export class ChromeBrowser {
  static getType(): BrowserType {
    return 'chrome';
  }

  static async getVersion(): Promise<string> {
    return chrome.runtime.getManifest().version;
  }

  static supportsWasm(): boolean {
    return typeof WebAssembly !== 'undefined';
  }

  static async sendMessage(message: any): Promise<any> {
    return chrome.runtime.sendMessage(message);
  }

  static async getStorage(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  static async setStorage(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}
