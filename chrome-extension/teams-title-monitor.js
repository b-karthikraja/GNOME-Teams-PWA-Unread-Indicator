(() => {
  'use strict';

  let lastCount = null;
  let lastTitle = null;

  function readTeamsUnreadCount() {
    const title = (document.title || '').trim();
    // Teams currently prefixes its title with a count when it has unread activity,
    // for example: "(3) Chat | Microsoft Teams".
    const match = title.match(/^\((\d+)\)\s*/);
    return {
      count: match ? Math.max(0, Number.parseInt(match[1], 10) || 0) : 0,
      title
    };
  }

  function publishIfChanged(force = false) {
    const { count, title } = readTeamsUnreadCount();
    if (!force && count === lastCount && title === lastTitle) return;
    lastCount = count;
    lastTitle = title;

    chrome.runtime.sendMessage({
      type: 'teams-unread-count',
      count,
      title
    }).catch(() => {
      // The extension service worker may be restarting; the next title/poll update retries.
    });
  }

  // Observe the title element/head instead of the entire Teams application DOM.
  function observeTitle() {
    if (document.head) {
      const observer = new MutationObserver(publishIfChanged);
      observer.observe(document.head, {
        subtree: true,
        childList: true,
        characterData: true
      });
    }
    publishIfChanged();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeTitle, { once: true });
  } else {
    observeTitle();
  }

  // A lightweight fallback in case Teams updates the title in a way not caught above.
  // Periodic resend also re-initializes the bridge if Chrome restarts its service worker.
  window.setInterval(() => publishIfChanged(true), 30000);
})();
