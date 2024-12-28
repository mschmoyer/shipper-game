import React, { useState } from 'react';
import './progress-bar.css';

const ProgressBar = ({ isError, isActive, labelText, progress, speed, autoMode, onMouseUp }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const tooFastPhrase = 'Cranking away!'

  // Factor in about a ~1 second poll delay. 
  const speedFactored = Math.max(speed - 100, 100);

  const tooFastToSeeSpeed = 601;
  const barWidth = (speed <= tooFastToSeeSpeed && isActive) ? 100 : isActive ? 100 : 0;
  const barModeClass = speed <= tooFastToSeeSpeed && autoMode && barWidth > 99 ? 'flash' : isActive ? 'smooth' : '';
  const automatedClass = autoMode ? 'automated' : '';
  const shouldHide = barWidth === 0 ? 'hidden' : '';

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    if (onMouseUp) {
      onMouseUp();
    }
  };

  // log all our props in one line
  console.log('ProgressBar - isActive:', isActive, 'isError:', isError, 'labelText:', labelText, 'progress:', progress, 'speed:', speed, 'autoMode:', autoMode);
  

  return (
    <div 
      className={`progress-bar-container ${isError ? 'error' : ''}`} 
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp}
    >
      <div 
        className={`progress-bar ${barModeClass} ${automatedClass} ${shouldHide} ${isMouseDown ? 'mousedown' : ''}`} 
        style={{ 
          width: `${barWidth}%`,
          transitionDuration: `${speedFactored}ms` // Dynamic transition duration in milliseconds
        }}
      ></div>
      <div className="progress-label">
        {speed < tooFastToSeeSpeed && isActive && !isError ? tooFastPhrase : labelText}
      </div>
    </div>
  );
};

export default ProgressBar;