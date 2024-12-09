import React, { useEffect } from 'react';
import './game-work-button.css';

const GameWorkButton = ({ autoShip, onClick, isWorkBeingDone, titleDefault, titleWhenWorking, hotkey }) => {
  const isMobileMode = window.innerWidth <= 600;

  useEffect(() => {
    const handleKeyPress = (event) => {
      if ((event.key === hotkey.toLowerCase() || event.key === hotkey.toUpperCase()) && !isMobileMode && !isWorkBeingDone) {
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [hotkey, isMobileMode, isWorkBeingDone, onClick]);

  return (
    <button
      className={`game-work-button ${autoShip ? 'auto-ship' : ''}`}
      onClick={onClick}
      disabled={isWorkBeingDone}
    >
      {autoShip ? 'Auto: ON' : isWorkBeingDone ? (isMobileMode ? '⏳' : titleWhenWorking) : titleDefault}
      {hotkey && !isMobileMode && <div className="hotkey-info">Hotkey: {hotkey}</div>}
    </button>
  );
};

export default GameWorkButton;