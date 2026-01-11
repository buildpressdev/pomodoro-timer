import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  formatTime,
  calculateTimeFromAngle,
  calculateProgress,
  loadTimerState,
  loadSettings,
  saveSettings,
} from '../../utils/timerUtils';
import { getTimerProgressColor } from '../../utils/themeColors';
import './PomodoroTimer.scss';

const PomodoroTimer = () => {
  const [duration, setDuration] = useState(25); // minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [customDuration, setCustomDuration] = useState(''); // for input field
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [theme, setTheme] = useState('dark'); // Dark default as requested
  const [autoOpenPopup, setAutoOpenPopup] = useState(true); // Auto-open on completion
  const debounceRef = useRef(null);
  const svgRef = useRef(null);

  // Load saved state and theme on mount
  useEffect(() => {
    const loadState = async () => {
      // Load timer state
      const state = await loadTimerState();
      setDuration(state.duration);
      setTimeRemaining(state.timeRemaining);
      setIsRunning(state.isRunning);
      setCustomDuration('');
      setIsCustomActive(false);

      // Load theme and settings preferences
      try {
        const [settings] = await Promise.all([loadSettings()]);

        setTheme(settings.theme);
        setAutoOpenPopup(settings.autoOpenPopupOnComplete);
        document.documentElement.setAttribute('data-theme', settings.theme);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadState();
  }, []);

  // Listen for storage updates from background script
  useEffect(() => {
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'sync' && changes.pomodoroState) {
        const newState = changes.pomodoroState.newValue;
        setTimeRemaining(newState.timeRemaining);
        setIsRunning(newState.isRunning);
        setDuration(newState.duration);
      }

      if (namespace === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        setTheme(newSettings.theme);
        setAutoOpenPopup(newSettings.autoOpenPopupOnComplete);
        document.documentElement.setAttribute('data-theme', newSettings.theme);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleCircleClick = useCallback(
    (event) => {
      if (isRunning) return; // Don't allow time changes while running

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const x = event.clientX - rect.left - centerX;
      const y = event.clientY - rect.top - centerY;

      // Calculate angle from -90 degrees (top) in radians
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      // Convert angle to minutes (use max of 60 for circle, or current duration if higher)
      const maxMinutes = Math.max(60, duration);
      const newDuration = calculateTimeFromAngle(angle, maxMinutes);
      setDuration(newDuration);
      setTimeRemaining(newDuration * 60);
    },
    [isRunning, duration]
  );

  const handleStart = useCallback(async () => {
    const startTimeValue = timeRemaining === 0 ? duration * 60 : timeRemaining;

    try {
      // Update state first
      await chrome.storage.sync.set({
        pomodoroState: {
          duration,
          timeRemaining: startTimeValue,
          isRunning: true,
          startTime: Date.now(),
          pausedTime: 0,
        },
      });

      // Send message to background script to start timer
      chrome.runtime.sendMessage(
        {
          action: 'startTimer',
          timeRemaining: startTimeValue,
        },
        (response) => {
          if (response && response.success) {
            setTimeRemaining(startTimeValue);
            setIsRunning(true);
          }
        }
      );
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }, [duration, timeRemaining]);

  const handleStop = useCallback(async () => {
    try {
      // Send message to background script to stop timer
      chrome.runtime.sendMessage(
        {
          action: 'stopTimer',
        },
        (response) => {
          if (response && response.success) {
            setIsRunning(false);
          }
        }
      );
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      // Send message to background script to reset timer
      chrome.runtime.sendMessage(
        {
          action: 'resetTimer',
        },
        (response) => {
          if (response && response.success) {
            setTimeRemaining(duration * 60);
            setIsRunning(false);
          }
        }
      );
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  }, [duration]);

  const handleCustomDurationChange = useCallback((e) => {
    const value = e.target.value;

    if (value === '' || /^\d+$/.test(value)) {
      setCustomDuration(value);
      setIsCustomActive(true);

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the timer update
      debounceRef.current = setTimeout(async () => {
        const minutes = parseInt(value, 10);
        if (minutes >= 1 && minutes <= 180) {
          try {
            // Update duration in storage
            await chrome.storage.sync.set({
              pomodoroState: {
                duration: minutes,
                timeRemaining: minutes * 60,
                isRunning: false,
                startTime: null,
                pausedTime: 0,
              },
            });

            setDuration(minutes);
            setTimeRemaining(minutes * 60);
          } catch (error) {
            console.error('Error setting custom duration:', error);
          }
        } else if (value === '') {
          setIsCustomActive(false);
        }
      }, 300);
    }
  }, []);

  const handleCustomDurationBlur = useCallback(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset input if empty after blur
    if (customDuration === '') {
      setIsCustomActive(false);
    }
  }, [customDuration]);

  const handleCustomDurationFocus = useCallback((e) => {
    e.target.select(); // Auto-select all text when focused
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    const updatedSettings = { theme: newTheme, autoOpenPopup };

    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    try {
      await saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [theme, autoOpenPopup]);

  const toggleAutoOpenPopup = useCallback(async () => {
    const newAutoOpenPopup = !autoOpenPopup;
    const updatedSettings = {
      theme,
      autoOpenPopupOnComplete: newAutoOpenPopup,
    };

    setAutoOpenPopup(newAutoOpenPopup);

    try {
      await saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save auto-open setting:', error);
    }
  }, [theme, autoOpenPopup]);

  const progress = calculateProgress(timeRemaining, duration * 60);
  const timerColor = getTimerProgressColor(progress);
  const formattedTime = formatTime(timeRemaining);

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-header">
        <h3>Pomodoro Timer</h3>
      </div>

      <div className="timer-display">
        <svg
          ref={svgRef}
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="timer-svg"
          onClick={handleCircleClick}
          style={{ cursor: isRunning ? 'default' : 'pointer' }}
        >
          <circle
            cx="110"
            cy="110"
            r="100"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            cx="110"
            cy="110"
            r="100"
            fill="none"
            stroke={timerColor}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 100}`}
            strokeDashoffset={`${2 * Math.PI * 100 * (1 - progress)}`}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            className="progress-circle"
          />
          <text
            x="110"
            y="110"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={theme === 'light' ? '32' : '28'}
            fontWeight="bold"
            fill={theme === 'light' ? '#0f0f23' : '#ffffff'}
            style={{
              textShadow:
                theme === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.2)'
                  : '0 2px 5px rgba(0, 0, 0, 0.8)',
            }}
          >
            {formattedTime}
          </text>
          {!isRunning && (
            <text
              x="110"
              y="130"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill={
                theme === 'light'
                  ? 'rgba(0, 0, 0, 0.6)'
                  : 'rgba(255, 255, 255, 0.8)'
              }
              style={{
                textShadow:
                  theme === 'light'
                    ? '0 1px 2px rgba(0, 0, 0, 0.1)'
                    : '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            />
          )}
        </svg>
      </div>

      <div className="timer-controls">
        {isRunning ? (
          <button onClick={handleStop} className="btn btn-stop">
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="btn btn-start"
            disabled={timeRemaining === 0 && duration === 0}
          >
            {timeRemaining === 0 ? 'Start' : 'Start'}
          </button>
        )}
        <button onClick={handleReset} className="btn btn-reset">
          Reset
        </button>
      </div>

      <div className="quick-select">
        <div className="quick-select-label">Quick Set</div>
        <div className="quick-select-buttons">
          {[5, 15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={async () => {
                if (!isRunning) {
                  try {
                    // Update duration in storage
                    await chrome.storage.sync.set({
                      pomodoroState: {
                        duration: mins,
                        timeRemaining: mins * 60,
                        isRunning: false,
                        startTime: null,
                        pausedTime: 0,
                      },
                    });

                    setDuration(mins);
                    setTimeRemaining(mins * 60);
                    setCustomDuration('');
                    setIsCustomActive(false);
                  } catch (error) {
                    console.error('Error setting duration:', error);
                  }
                }
              }}
              className={`quick-btn ${duration === mins && !isCustomActive ? 'active' : ''}`}
              disabled={isRunning}
            >
              {mins}m
            </button>
          ))}
          <input
            type="text"
            value={customDuration}
            onChange={handleCustomDurationChange}
            onBlur={handleCustomDurationBlur}
            onFocus={handleCustomDurationFocus}
            placeholder="Custom"
            className={`quick-btn quick-btn-input ${isCustomActive ? 'active custom-active' : ''}`}
            disabled={isRunning}
            min="1"
            max="180"
          />
        </div>
      </div>

      <div className="pomodoro-footer">
        <div className="status">
          Status:{' '}
          <span className={`status-${isRunning ? 'running' : 'stopped'}`}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'light'}
          title={`Current: ${theme} mode. Click to switch to ${theme === 'dark' ? 'light' : 'dark'} mode.`}
        >
          <svg
            className={`icon ${theme === 'dark' ? 'sun-icon' : 'moon-icon'}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {theme === 'dark' ? (
              <g>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </g>
            ) : (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </svg>
        </button>

        <button
          className="auto-open-toggle"
          onClick={toggleAutoOpenPopup}
          aria-label={
            autoOpenPopup ? 'Disable auto-open popup' : 'Enable auto-open popup'
          }
          aria-pressed={autoOpenPopup}
          title={`Auto-open popup when timer completes: ${autoOpenPopup ? 'Enabled' : 'Disabled'}`}
        >
          <svg
            className="icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="toggle-indicator">
            {autoOpenPopup ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
