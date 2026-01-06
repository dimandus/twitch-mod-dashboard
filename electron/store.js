// electron/store.js
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore; // важная строка для electron-store@11+

const schema = {
  twitch: {
    type: 'object',
    properties: {
      clientId: { type: 'string' },
      clientSecret: { type: 'string' },
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      scopes: {
        type: 'array',
        items: { type: 'string' }
      },
      userId: { type: 'string' },
      login: { type: 'string' }
    },
    additionalProperties: true
  },
  settings: {
    type: 'object',
    properties: {
      theme: { type: 'string', default: 'dark' },
      language: { type: 'string', default: 'ru' },
      channels: {
        type: 'array',
        items: { type: 'string' },
        default: []
      },
      chatLayout: {
        type: 'object',
        properties: {
          rows: { type: 'number', enum: [1, 2], default: 1 },
          paneWidth: { type: 'number', default: 320 },
          paneHeight: { type: 'number', default: 260 }
        },
        additionalProperties: true,
        default: {}
      }
    },
    additionalProperties: true
  }
};

const store = new Store({
  name: 'config',
  schema
  // encryptionKey: 'если захочешь шифровать конфиг'
});

module.exports = store;