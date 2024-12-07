import React from 'react';
import './progress-bar.css';

const ProgressBar = ({ isError, isActive, labelText, progress, speed, autoMode }) => {

  const phrases = [
    "Blink and it's done!",
    "Faster than a speeding bullet!",
    "Done in a flash!",
    "Whizzing through steps!",
    "Work? What work? Already done!",
    "Turbo-charged progress!",
    "So fast, its almost magic!",
    "Warp speed complete!"
  ];  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  // Factor in about a ~1 second poll delay. 
  const speedFactored = Math.max(speed - 100, 100);

  const tooFastToSeeSpeed = 100;
  const barWidth = (speed < tooFastToSeeSpeed && isActive) ? 100 : isActive ? 100 : 0;
  const barModeClass = speed < tooFastToSeeSpeed && autoMode && barWidth > 99 ? 'flash' : isActive ? 'smooth' : '';
  const automatedClass = autoMode ? 'automated' : '';

  return (
    <div className={`progress-bar-container ${isError ? 'error' : ''}`}>
      <div 
        className={`progress-bar ${barModeClass} ${automatedClass}`} 
        style={{ 
          width: `${barWidth}%`,
          transitionDuration: `${speedFactored}ms` // Dynamic transition duration in milliseconds
        }}
      ></div>
      <div className="progress-label">
        {speed < tooFastToSeeSpeed && isActive ? randomPhrase : labelText}
      </div>
    </div>
  );
};

export default ProgressBar;