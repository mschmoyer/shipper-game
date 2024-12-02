import React from 'react';
import './game-work-button.css';

const GameWorkButton = ({ autoShip, onClick, isWorkBeingDone, titleDefault, titleWhenWorking, hotkey }) => {
  return (
    <button
      className={`game-work-button ${autoShip ? 'auto-ship' : ''}`}
      onClick={onClick}
      disabled={isWorkBeingDone}
    >
      {autoShip ? 'Working...' : isWorkBeingDone ? titleWhenWorking : titleDefault}
      {hotkey && <div className="hotkey-info">Hotkey: {hotkey}</div>}
    </button>
  );
};

export default GameWorkButton;