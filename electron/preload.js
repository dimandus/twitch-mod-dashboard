const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value),
    delete: (key) => ipcRenderer.invoke('config:delete', key)
  },

  twitch: {
    // Авторизация
    login: () => ipcRenderer.invoke('twitch:login'),
    loginViaDimandus: () => ipcRenderer.invoke('twitch:loginViaDimandus'),
    getCurrentUser: () => ipcRenderer.invoke('twitch:getCurrentUser'),
    logout: () => ipcRenderer.invoke('twitch:logout'),
getUserDetails: (login) =>
  ipcRenderer.invoke('twitch:getUserDetails', login),
    // Информация о каналах и пользователях
    getChannelChatters: (channelLogin) =>
      ipcRenderer.invoke('twitch:getChannelChatters', channelLogin),
    getModeratedChannels: () =>
      ipcRenderer.invoke('twitch:getModeratedChannels'),
    getChannelsLiveStatus: (logins) =>
      ipcRenderer.invoke('twitch:getChannelsLiveStatus', logins),
    getUsersInfo: (logins) =>
      ipcRenderer.invoke('twitch:getUsersInfo', logins),

    // ОТПРАВКА СООБЩЕНИЯ ЧЕРЕЗ HELIX
    sendChatMessage: (channel, text) =>
      ipcRenderer.invoke('twitch:sendChatMessage', channel, text),
ensureAccessToken: () => ipcRenderer.invoke('twitch:ensureAccessToken'),
    // =====================================================
    // МОДЕРАЦИЯ
    // =====================================================

    // Баны и таймауты
    banUser: (channelLogin, userLogin, duration = null, reason = '') =>
      ipcRenderer.invoke(
        'twitch:banUser',
        channelLogin,
        userLogin,
        duration,
        reason
      ),
    timeoutUser: (channelLogin, userLogin, duration = 600, reason = '') =>
      ipcRenderer.invoke(
        'twitch:timeoutUser',
        channelLogin,
        userLogin,
        duration,
        reason
      ),
    unbanUser: (channelLogin, userLogin) =>
      ipcRenderer.invoke('twitch:unbanUser', channelLogin, userLogin),

    // Сообщения
    deleteMessage: (channelLogin, messageId) =>
      ipcRenderer.invoke('twitch:deleteMessage', channelLogin, messageId),
    clearChat: (channelLogin) =>
      ipcRenderer.invoke('twitch:clearChat', channelLogin),

    // Настройки чата
    getChatSettings: (channelLogin) =>
      ipcRenderer.invoke('twitch:getChatSettings', channelLogin),
    updateChatSettings: (channelLogin, settings) =>
      ipcRenderer.invoke('twitch:updateChatSettings', channelLogin, settings),

    // Shield Mode
    getShieldMode: (channelLogin) =>
      ipcRenderer.invoke('twitch:getShieldMode', channelLogin),
    setShieldMode: (channelLogin, isActive) =>
      ipcRenderer.invoke('twitch:setShieldMode', channelLogin, isActive),

    getFollowedChannels: () =>
      ipcRenderer.invoke('twitch:getFollowedChannels'),

    // Быстрые команды для настроек чата
    slowMode: (channelLogin, enabled, seconds = 30) =>
      ipcRenderer.invoke('twitch:slowMode', channelLogin, enabled, seconds),
    followersOnly: (channelLogin, enabled, minutes = 10) =>
      ipcRenderer.invoke(
        'twitch:followersOnly',
        channelLogin,
        enabled,
        minutes
      ),
    subscribersOnly: (channelLogin, enabled) =>
      ipcRenderer.invoke('twitch:subscribersOnly', channelLogin, enabled),
    emoteOnly: (channelLogin, enabled) =>
      ipcRenderer.invoke('twitch:emoteOnly', channelLogin, enabled),

    // Объявления
    sendAnnouncement: (channelLogin, message, color = 'primary') =>
      ipcRenderer.invoke(
        'twitch:sendAnnouncement',
        channelLogin,
        message,
        color
      )
  }
});