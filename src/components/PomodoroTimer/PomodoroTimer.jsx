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
import './PomodoroTimer.scss';

const PomodoroTimer = () => {
  const [duration, setDuration] = useState(25); // minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [pausedTime, setPausedTime] = useState(0);
  const [customDuration, setCustomDuration] = useState(''); // for input field
  const intervalRef = useRef(null);
  const svgRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const loadState = async () => {
      const state = await loadTimerState();
      setDuration(state.duration);
      setTimeRemaining(state.timeRemaining);
      setIsRunning(state.isRunning);
      setStartTime(state.startTime);
      setPausedTime(state.pausedTime || 0);
      setCustomDuration('');

      // Update badge
      updateBadge(state.timeRemaining);
    };
    loadState();
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
    console.log('Stop button clicked');
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleReset = useCallback(() => {
    console.log('Reset button clicked');
    setIsRunning(false);
    setTimeRemaining(duration * 60);
    setStartTime(null);
    setPausedTime(0);
  }, [duration]);

  const handleCustomDurationSet = useCallback(() => {
    const minutes = parseInt(customDuration, 10);
    if (minutes >= 1 && minutes <= 180) {
      setDuration(minutes);
      setTimeRemaining(minutes * 60);
      setCustomDuration('');
    }
  }, [customDuration]);

  const handleCustomDurationChange = useCallback((e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomDuration(value);
    }
  }, []);

  const progress = calculateProgress(timeRemaining, duration * 60);
  const timerColor = getTimerColor(progress);
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
            fontSize="28"
            fontWeight="bold"
            fill="#ffffff"
            textShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
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
              fill="rgba(255, 255, 255, 0.8)"
              textShadow="0 1px 2px rgba(0, 0, 0, 0.3)"
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
        <div className="quick-select-label">Quick Set:</div>
        <div className="quick-select-buttons">
          {[5, 15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                if (!isRunning) {
                  setDuration(mins);
                  setTimeRemaining(mins * 60);
                }
              }}
              className={`quick-btn ${duration === mins ? 'active' : ''}`}
              disabled={isRunning}
            >
              {mins}m
            </button>
          ))}
        </div>

        <div className="custom-duration">
          <div className="custom-duration-label">Custom:</div>
          <div className="custom-duration-controls">
            <input
              type="text"
              value={customDuration}
              onChange={handleCustomDurationChange}
              placeholder="min"
              className="custom-duration-input"
              disabled={isRunning}
              min="1"
              max="180"
            />
            <button
              onClick={handleCustomDurationSet}
              className="btn btn-custom"
              disabled={
                isRunning ||
                !customDuration ||
                parseInt(customDuration, 10) < 1 ||
                parseInt(customDuration, 10) > 180
              }
            >
              Set
            </button>
          </div>
        </div>
      </div>

      <div className="pomodoro-footer">
        <div className="status">
          Status:{' '}
          <span className={`status-${isRunning ? 'running' : 'stopped'}`}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
