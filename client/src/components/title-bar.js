import React, { useState } from 'react';
import './title-bar.css';

const TitleBar = ({ gameTitle, gameSubTitle, onEndGame, onToggleLeaderboard, onHowToPlay, isGameActive }) => {
  const [showModal, setShowModal] = useState(false);

  const handleEndGameClick = () => {
    setShowModal(true);
  };

  const confirmEndGame = () => {
    setShowModal(false);
    onEndGame();
  };

  const cancelEndGame = () => {
    setShowModal(false);
  };

  return (
    <div className="title-bar">
      <div>
        <h1>{gameTitle}</h1>
        <h2 className="subtitle">{gameSubTitle}</h2>
      </div>
      <div className="button-group">
        {isGameActive && (
          <button className="title-bar-button" onClick={handleEndGameClick}>
            <span role="img" aria-label="End Game">🛑</span>
            <span>Abandon</span>
          </button>
        )}
        <button className="title-bar-button" onClick={onToggleLeaderboard}>
          <span role="img" aria-label="Leaderboard">📊</span>
          <span>Leaders</span>
        </button>
        <button className="title-bar-button" onClick={onHowToPlay}>
          <span role="img" aria-label="How To Play">📖</span>
          <span>Help</span>
        </button>
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Walk Away?</h2>
            <p>This will shutter this business and send you to the end game results page.</p>
            <p className="emoji">😱</p>
            <button className="confirm" onClick={confirmEndGame}>Confirm</button>
            <button className="cancel" onClick={cancelEndGame}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TitleBar;