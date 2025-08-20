declare let __webpack_public_path__: string;

const runtime = (globalThis as any).chrome?.runtime || (globalThis as any).browser?.runtime;
const baseUrl = typeof runtime?.getURL === 'function' ? runtime.getURL('') : '';
(globalThis as any).__webpack_public_path__ = baseUrl || '';


