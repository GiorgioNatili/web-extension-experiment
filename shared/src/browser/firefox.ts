import { BrowserType } from '../types/browser';

// Declare browser API for Firefox
declare const browser: any;

export class FirefoxBrowser {
  static getType(): BrowserType {
    return 'firefox';
  }

  static async getVersion(): Promise<string> {
    return browser.runtime.getManifest().version;
  }

  static supportsWasm(): boolean {
    return typeof WebAssembly !== 'undefined';
  }

  static async sendMessage(message: any): Promise<any> {
    return browser.runtime.sendMessage(message);
  }

  static async getStorage(key: string): Promise<any> {
    const result = await browser.storage.local.get([key]);
    return result[key];
  }

  static async setStorage(key: string, value: any): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }
}
