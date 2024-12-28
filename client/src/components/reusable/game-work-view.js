import React from 'react';
import './game-work-view.css';
import GameWorkLeftData from './game-work-left-data';
import ProgressBar from './progress-bar';

const GameWorkView = ({ 
    name, 
    emoji, 
    quantity,
    infoItems, 
    isEnabled, 
    isClickable, 
    isAutomated, 
    progress, 
    speed, 
    progressBarLabelText,
    progressBarMouseUp 
}) => {
  return (
    <div className="game-work-container">
      <div className="build-product-info">
        <h3>
          <span className="build-product-emoji">{emoji}</span> {name}
        </h3>
      </div>
      {infoItems.length > 0 && 
        <div className="info-section">
          {infoItems.map((item, index) => (
            <p key={index}>
              {item.emoji} {item.key}: {item.value}
            </p>
          ))}
        </div>
      }
      <div className="main-bar">
        <GameWorkLeftData
          emoji={emoji}
          quantity={quantity}
        />
        <ProgressBar
          isError={!isEnabled}
          isActive={!isClickable}
          labelText={progressBarLabelText}
          progress={progress}
          speed={speed}
          autoMode={isAutomated}
          onMouseUp={progressBarMouseUp}
        />
      </div>
    </div>
  );
};

export default GameWorkView;
