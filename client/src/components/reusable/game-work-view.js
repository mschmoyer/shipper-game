import React from 'react';
import './game-work-view.css';
import GameWorkButton from './game-work-button';
import ProgressBar from './progress-bar';

const GameWorkView = ({ 
    infoItems, 
    isEnabled, 
    isClickable, 
    isAutomated, 
    onClick, 
    buttonTitle, 
    buttonTitleBusy, 
    hotkey, 
    progress, 
    speed, 
    progressBarLabelText 
}) => {
  return (
    <div className="game-work-container">
      <div className="info-section">
        {infoItems.map((item, index) => (
          <p key={index}>
            {item.emoji} {item.key}: {item.value}
          </p>
        ))}
      </div>
      <div className="main-bar">
        <GameWorkButton
          autoShip={isAutomated}
          onClick={onClick}
          isWorkBeingDone={!isClickable}
          titleDefault={buttonTitle}
          titleWhenWorking={buttonTitleBusy}
          hotkey={hotkey}
        />
        <ProgressBar
          isError={!isEnabled}
          isActive={!isClickable}
          labelText={progressBarLabelText}
          progress={progress}
          speed={speed}
          autoMode={isAutomated}
        />
      </div>
    </div>
  );
};

export default GameWorkView;
