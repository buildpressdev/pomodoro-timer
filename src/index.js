let timerInterval = null;

// Load timer state and continue countdown if needed
const initializeTimer = async () => {
  try {
    const result = await chrome.storage.sync.get(['pomodoroState']);
    const state = result.pomodoroState;
    
    if (state && state.isRunning && state.timeRemaining > 0) {
      // Calculate time elapsed since popup was closed
      const timeElapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const actualTimeRemaining = Math.max(0, state.timeRemaining - timeElapsed);
      
      if (actualTimeRemaining > 0) {
        // Update state and continue timer
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            timeRemaining: actualTimeRemaining
          }
        });
        
        // Start background timer
        startBackgroundTimer(actualTimeRemaining);
        updateBadge(actualTimeRemaining);
      } else {
        // Timer completed while popup was closed
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            isRunning: false,
            timeRemaining: 0
          }
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

const startBackgroundTimer = (initialTime) => {
  let timeRemaining = initialTime;
  
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    timeRemaining--;
    
    updateBadge(timeRemaining);
    
    // Update storage with current time
    chrome.storage.sync.get(['pomodoroState'], (result) => {
      const state = result.pomodoroState;
      if (state) {
        chrome.storage.sync.set({
          pomodoroState: {
            ...state,
            timeRemaining
          }
        });
      }
    });
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      
      // Update state to stopped
      chrome.storage.sync.get(['pomodoroState'], (result) => {
        const state = result.pomodoroState;
        if (state) {
          chrome.storage.sync.set({
            pomodoroState: {
              ...state,
              isRunning: false,
              timeRemaining: 0
            }
          });
        }
      });
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Timer Complete!',
        message: 'Your Pomodoro session has ended.',
      });
      
      updateBadge(0);
    }
  }, 1000);
};

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

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Pomodoro Timer Extension installed');
  
  // Initialize default state
  chrome.storage.sync.set({
    pomodoroState: {
      duration: 25,
      timeRemaining: 25 * 60,
      isRunning: false,
      startTime: null,
      pausedTime: 0
    }
  });
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  initializeTimer();
});

// Handle alarm from timer completion (if available)
if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoroTimer') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Timer Complete!',
        message: 'Your Pomodoro session has ended.',
      });
      updateBadge(0);
    }
  });
}

// Initialize on first load
initializeTimer();