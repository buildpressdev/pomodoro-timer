export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateTimeFromAngle = (angle, maxMinutes = 60) => {
  // Convert angle (0-360) to minutes (0-maxMinutes)
  const normalizedAngle = angle < 0 ? angle + 360 : angle;
  const minutes = Math.round((normalizedAngle / 360) * maxMinutes);
  return Math.max(0, Math.min(maxMinutes, minutes));
};

export const calculateProgress = (timeRemaining, totalTime) => {
  if (totalTime === 0) return 0;
  return Math.max(0, Math.min(1, timeRemaining / totalTime));
};

export const getTimerColor = (progress) => {
  if (progress > 0.5) return '#4CAF50'; // Green
  if (progress > 0.25) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

export const saveTimerState = async (state) => {
  try {
    await chrome.storage.sync.set({ pomodoroState: state });
  } catch (error) {
    console.error('Error saving timer state:', error);
  }
};

export const loadTimerState = async () => {
  try {
    const result = await chrome.storage.sync.get(['pomodoroState']);
    return result.pomodoroState || {
      duration: 25,
      timeRemaining: 25 * 60,
      isRunning: false,
      startTime: null,
      pausedTime: 0
    };
  } catch (error) {
    console.error('Error loading timer state:', error);
    return {
      duration: 25,
      timeRemaining: 25 * 60,
      isRunning: false,
      startTime: null,
      pausedTime: 0
    };
  }
};

export const updateBadge = (timeRemaining) => {
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

export const showNotification = (title, message) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title,
    message
  });
};