// jest-dom gibi eklentileri etkinleştirir
require('@testing-library/jest-dom');

// Mock import.meta for Vite environment variables
global.import = global.import || {};
global.import.meta = {
  env: {
    DEV: false,
    MODE: 'test',
    PROD: false,
    SSR: false,
  }
};

// JSDOM'da bulunmayan tarayıcı API'leri için global mock'lar ekle
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ files: [], folder: '' }), // Settings.tsx'deki /list-backups için varsayılan mock
  })
);

global.EventSource = jest.fn(() => ({
  onopen: jest.fn(),
  onerror: jest.fn(),
  addEventListener: jest.fn(),
  close: jest.fn(),
}));

// App.test.tsx'de tema tespiti için window.matchMedia'yı mock'la
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false, // varsayılan olarak açık tema
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// CheckoutModal.test.tsx'de window.alert'i mock'la
global.alert = jest.fn();