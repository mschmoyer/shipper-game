import React from 'react';
import './game-work-button.css';

const GameWorkButton = ({ autoShip, onClick, isWorkBeingDone, titleDefault, titleWhenWorking, hotkey }) => {
  const isMobileMode = window.innerWidth <= 600;
  return (
    <button
      className={`game-work-button ${autoShip ? 'auto-ship' : ''}`}
      onClick={onClick}
      disabled={isWorkBeingDone}
    >
      {autoShip ? 'Working...' : isWorkBeingDone ? titleWhenWorking : titleDefault}
      {!isWorkBeingDone && hotkey && !isMobileMode && <div className="hotkey-info">Hotkey: {hotkey}</div>}
    </button>
  );
};

export default GameWorkButton;