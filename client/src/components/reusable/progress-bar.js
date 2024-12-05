import React from 'react';
import './progress-bar.css';

const ProgressBar = ({ isError, isActive, labelText, progress, speed, autoMode }) => {
  return (
    <div className={`progress-bar-container ${isError ? 'error' : ''}`}>
      <div 
        className={`progress-bar ${speed < 100 && autoMode ? 'flash' : isActive ? 'smooth' : ''} ${autoMode ? 'automated': ''}`} 
        style={{ width: `${autoMode && speed < 100 ? 100 : isActive ? progress : 0}%` }}
      ></div>
      <div className="progress-label">
        {speed < 100 ? "Doing thing so fast..." : labelText}
      </div>
    </div>
  );
};

export default ProgressBar;