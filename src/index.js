// Background timer management using Chrome Alarms API
const ALARM_NAME = 'pomodoroTimer';

// Load timer state and continue countdown if needed
const initializeTimer = async () => {
  try {
    const result = await chrome.storage.sync.get(['pomodoroState']);
    const state = result.pomodoroState;

    if (state && state.isRunning && state.timeRemaining > 0) {
      // Calculate time elapsed since popup was closed
      const timeElapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const actualTimeRemaining = Math.max(
        0,
        state.timeRemaining - timeElapsed
      );

      if (actualTimeRemaining > 0) {
        // Update state and continue timer with alarm
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            timeRemaining: actualTimeRemaining,
          },
        });

        // Start background timer using alarms
        startBackgroundAlarm(actualTimeRemaining);
        updateBadge(actualTimeRemaining);
      } else {
        // Timer completed while popup was closed
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            isRunning: false,
            timeRemaining: 0,
          },
        });

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Timer Complete!',
          message: 'Your Pomodoro session has ended.',
        });

        updateBadge(0);
      }
    }
  } catch (error) {
    console.error('Error initializing timer:', error);
  }
};

// Start background timer using Chrome Alarms API
const startBackgroundAlarm = (timeRemaining) => {
  // Clear any existing alarm
  chrome.alarms.clear(ALARM_NAME);

  // Create alarm for timer completion
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: timeRemaining / 60, // Convert seconds to minutes
    periodInMinutes: undefined, // One-time alarm
  });

  // Start periodic updates for badge and storage
  updateTimerPeriodically(timeRemaining);
};

// Clear background alarm
const clearBackgroundAlarm = () => {
  chrome.alarms.clear(ALARM_NAME);
};

// Update timer periodically (every second) for badge and storage
let updateInterval = null;
const updateTimerPeriodically = (initialTime) => {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  let timeRemaining = initialTime;

  updateInterval = setInterval(() => {
    timeRemaining--;

    updateBadge(timeRemaining);

    // Update storage with current time
    chrome.storage.sync.get(['pomodoroState'], (result) => {
      const state = result.pomodoroState;
      if (state) {
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            timeRemaining,
          },
        });
      }
    });

    if (timeRemaining <= 0) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }, 1000);
};

// Stop timer updates
const stopTimerUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

// Update badge with current time
const updateBadge = (timeRemaining) => {
  if (timeRemaining > 0) {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const text = mins > 0 ? `${mins}m` : `${secs}s`;
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
};

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    // Timer completed
    stopTimerUpdates();

    chrome.storage.sync.get(['pomodoroState', 'settings'], (result) => {
      const state = result.pomodoroState;
      const settings = result.settings || {};

      if (state) {
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            isRunning: false,
            timeRemaining: 0,
          },
        });
      }

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Timer Complete!',
        message: 'Your Pomodoro session has ended.',
      });

      // Auto-open popup if setting is enabled
      if (settings.autoOpenPopupOnComplete !== false) {
        chrome.action.openPopup().catch(() => {
          // Silently fail if popup can't open (e.g., browser restrictions)
        });
      }
    });

    updateBadge(0);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTimer') {
    const { timeRemaining } = request;
    startBackgroundAlarm(timeRemaining);
    sendResponse({ success: true });
  } else if (request.action === 'stopTimer') {
    clearBackgroundAlarm();
    stopTimerUpdates();
    chrome.storage.sync.get(['pomodoroState'], (result) => {
      const state = result.pomodoroState;
      if (state) {
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            isRunning: false,
          },
        });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === 'resetTimer') {
    clearBackgroundAlarm();
    stopTimerUpdates();
    chrome.storage.sync.get(['pomodoroState'], (result) => {
      const state = result.pomodoroState;
      if (state) {
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            isRunning: false,
            timeRemaining: state.duration * 60,
          },
        });
        updateBadge(state.duration * 60);
      }
    });
    sendResponse({ success: true });
  }
});

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default state and settings
  chrome.storage.sync.set({
    pomodoroState: {
      duration: 25,
      timeRemaining: 25 * 60,
      isRunning: false,
      startTime: null,
      pausedTime: 0,
    },
    settings: {
      autoOpenPopupOnComplete: true,
      theme: 'dark',
    },
  });
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  initializeTimer();
});

// Initialize on first load
initializeTimer();
