'use strict';

const NATIVE_HOST = 'com.local.teams_unread_indicator';
let lastPublishedCount;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'teams-unread-count') return;
  if (!Number.isInteger(message.count) || message.count < 0 || message.count > 100000) {
    sendResponse({ ok: false, error: 'Invalid count' });
    return;
  }

  // Ignore duplicate title changes that don't change the count.
  if (lastPublishedCount === message.count) {
    sendResponse({ ok: true, unchanged: true });
    return;
  }
  lastPublishedCount = message.count;

  chrome.runtime.sendNativeMessage(
    NATIVE_HOST,
    {
      count: message.count,
      title: typeof message.title === 'string' ? message.title.slice(0, 300) : ''
    },
    (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('Teams unread indicator native host:', error.message);
        sendResponse({ ok: false, error: error.message });
        return;
      }
      sendResponse(response || { ok: true });
    }
  );
  return true;
});
