import React from 'react';
import './progress-bar.css';

const ProgressBar = ({ isError, isActive, labelText, progress, speed, autoMode }) => {

  // const phrases = [
  //   "Blink and it's done!",
  //   "Faster than a speeding bullet!",
  //   "Done in a flash!",
  //   "Whizzing through steps!",
  //   "Work? What work? Already done!",
  //   "Turbo-charged progress!",
  //   "So fast, its almost magic!",
  //   "Warp speed complete!"
  // ];  
  // const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const tooFastPhrase = 'Cranking away!'

  // spit out all the props on one line
  // console.log('ProgressBar - isActive:', isActive, 'isError:', isError, 
  //   'labelText:', labelText, 'progress:', progress, 'speed:', speed, 'autoMode');

  // Factor in about a ~1 second poll delay. 
  const speedFactored = Math.max(speed - 100, 100);

  const tooFastToSeeSpeed = 601;
  const barWidth = (speed <= tooFastToSeeSpeed && isActive) ? 100 : isActive ? 100 : 0;
  const barModeClass = speed <= tooFastToSeeSpeed && autoMode && barWidth > 99 ? 'flash' : isActive ? 'smooth' : '';
  const automatedClass = autoMode ? 'automated' : '';
  const shouldHide = barWidth === 0 ? 'hidden' : '';

  // log all our props in one line
  console.log('ProgressBar - isActive:', isActive, 'isError:', isError, 'labelText:', labelText, 'progress:', progress, 'speed:', speed, 'autoMode:', autoMode);
  

  return (
    <div className={`progress-bar-container ${isError ? 'error' : ''}`}>
      <div 
        className={`progress-bar ${barModeClass} ${automatedClass} ${shouldHide}`} 
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