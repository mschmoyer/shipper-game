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

  console.log('isActive:', isActive);
  const tooFastToSeeSpeed = 300;
  const barWidth = autoMode || (speed < tooFastToSeeSpeed && isActive) ? 100 : isActive ? progress : 0;
  const barModeClass = speed < tooFastToSeeSpeed && autoMode ? 'flash' : isActive ? 'smooth' : '';
  const automatedClass = autoMode ? 'automated' : '';
  return (
    <div className={`progress-bar-container ${isError ? 'error' : ''}`}>
      <div 
        className={`progress-bar ${barModeClass} ${automatedClass}`} 
        style={{ 
          width: `${barWidth}%`,
          transitionDuration: `${speed}ms` // Dynamic transition duration in milliseconds
        }}
      ></div>
      <div className="progress-label">
        {speed < tooFastToSeeSpeed && isActive ? randomPhrase : labelText}
      </div>
    </div>
  );
};

export default ProgressBar;