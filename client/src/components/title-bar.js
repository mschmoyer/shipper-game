import React, { useState } from 'react';
import './title-bar.css';

const TitleBar = ({ gameTitle, gameSubTitle, onNewGame, onToggleLeaderboard, onHowToPlay }) => {
  const [showModal, setShowModal] = useState(false);

  const handleNewGameClick = () => {
    setShowModal(true);
  };

  const confirmNewGame = () => {
    setShowModal(false);
    onNewGame();
  };

  const cancelNewGame = () => {
    setShowModal(false);
  };

  return (
    <div className="title-bar">
      <div>
        <h1>{gameTitle}</h1>
        <h2 className="subtitle">{gameSubTitle}</h2>
      </div>
      <div className="button-group">
        <button className="title-bar-button" onClick={handleNewGameClick}>
          <span role="img" aria-label="New Game">🎮</span>
          <span>New Game</span>
        </button>
        <button className="title-bar-button" onClick={onToggleLeaderboard}>
          <span role="img" aria-label="Leaderboard">📊</span>
          <span>Leaderboard</span>
        </button>
        <button className="title-bar-button" onClick={onHowToPlay}>
          <span role="img" aria-label="How To Play">📖</span>
          <span>How To Play</span>
        </button>
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Start Over?</h2>
            <p>You will cede control of your current business and start a new one from scratch. Do you want to continue?</p>
            <p className="emoji">😱</p>
            <button className="confirm" onClick={confirmNewGame}>Confirm</button>
            <button className="cancel" onClick={cancelNewGame}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TitleBar;