import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  formatTime,
  calculateTimeFromAngle,
  calculateProgress,
  getTimerColor,
  saveTimerState,
  loadTimerState,
  updateBadge,
  showNotification,
} from '../../utils/timerUtils';
import { getThemeColors, getTimerProgressColor } from '../../utils/themeColors';
import './PomodoroTimer.scss';

const PomodoroTimer = () => {
  const [duration, setDuration] = useState(25); // minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [pausedTime, setPausedTime] = useState(0);
  const [customDuration, setCustomDuration] = useState(''); // for input field
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [theme, setTheme] = useState('dark'); // Dark default as requested
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);
  const svgRef = useRef(null);

  // Load saved state and theme on mount
  useEffect(() => {
    const loadState = async () => {
      // Load timer state
      const state = await loadTimerState();
      setDuration(state.duration);
      setTimeRemaining(state.timeRemaining);
      setIsRunning(state.isRunning);
      setStartTime(state.startTime);
      setPausedTime(state.pausedTime || 0);
      setCustomDuration('');
      setIsCustomActive(false);

      // Load theme preference
      try {
        const result = await chrome.storage.sync.get(['theme']);
        const savedTheme = result.theme || 'dark'; // Dark default as requested
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
      }

      // Update badge
      updateBadge(state.timeRemaining);
    };
    loadState();
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    const state = {
      duration,
      timeRemaining,
      isRunning,
      startTime,
      pausedTime,
    };
    saveTimerState(state);
    updateBadge(timeRemaining);
  }, [duration, timeRemaining, isRunning, startTime, pausedTime]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            showNotification(
              'Timer Complete!',
              'Your Pomodoro session has ended.'
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

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
    [isRunning]
  );

  const handleStart = useCallback(() => {
    if (timeRemaining === 0) {
      // Reset timer if it's done
      setTimeRemaining(duration * 60);
    }
    setIsRunning(true);
    setStartTime(Date.now());
    setPausedTime(0);
  }, [duration, timeRemaining]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(duration * 60);
    setStartTime(null);
    setPausedTime(0);
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
      debounceRef.current = setTimeout(() => {
        const minutes = parseInt(value, 10);
        if (minutes >= 1 && minutes <= 180) {
          setDuration(minutes);
          setTimeRemaining(minutes * 60);
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
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    try {
      await chrome.storage.sync.set({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [theme]);

  const progress = calculateProgress(timeRemaining, duration * 60);
  const timerColor = getTimerProgressColor(progress);
  const themeColors = getThemeColors(theme);
  const formattedTime = formatTime(timeRemaining);

  // Developer information
  const developerInfo = {
    name: 'BuildPress',
    email: 'hello@buildpress.dev',
    url: 'https://buildpress.dev',
    version: '1.0.0',
  };

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
          {/* Background circle */}
          <circle
            cx="110"
            cy="110"
            r="100"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />

          {/* Progress circle */}
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

          {/* Time text */}
          <text
            x="110"
            y="110"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={theme === 'light' ? '32' : '28'}
            fontWeight="bold"
            fill={theme === 'light' ? '#0f0f23' : '#ffffff'}
            textShadow={
              theme === 'light'
                ? '0 1px 3px rgba(0, 0, 0, 0.2)'
                : '0 2px 5px rgba(0, 0, 0, 0.8)'
            }
          >
            {formattedTime}
          </text>

          {/* Duration text when not running */}
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
              textShadow={
                theme === 'light'
                  ? '0 1px 2px rgba(0, 0, 0, 0.1)'
                  : '0 1px 2px rgba(0, 0, 0, 0.3)'
              }
            ></text>
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
              onClick={() => {
                if (!isRunning) {
                  setDuration(mins);
                  setTimeRemaining(mins * 60);
                  setCustomDuration('');
                  setIsCustomActive(false);
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
          className="about-toggle"
          onClick={() => {
            // Simple about info (in real implementation, this would open an about modal)
            alert(
              `Pomodoro Timer v${developerInfo.version}\n\nCreated by ${developerInfo.name}\nContact: ${developerInfo.email}\nWebsite: ${developerInfo.url}`
            );
          }}
          aria-label="About developer"
          title="Developer information and support"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M17 7l-5 5 5v6h10v-6l5-5z" />
          </svg>
        </button>

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
            stroke-width="2"
          >
            {theme === 'dark' ? (
              // Sun icon
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
              // Moon icon
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
