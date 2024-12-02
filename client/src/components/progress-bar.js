
import React from 'react';
import './progress-bar.css';

const ProgressBar = ({ isError, isActive, labelText, progress }) => {
  return (
    <div className={`progress-bar-container ${isError ? 'error' : ''}`}>
      <div className={`progress-bar ${isActive ? 'smooth' : ''}`} style={{ width: `${isActive ? progress : 0}%` }}></div>
      <div className="progress-label">
        {labelText}
      </div>
    </div>
  );
};

export default ProgressBar;