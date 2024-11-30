import React from 'react';
import './title-bar.css';

const TitleBar = ({ gameTitle, gameSubTitle, onNewGame, onToggleLeaderboard, onHowToPlay }) => {
  return (
    <div className="title-bar">
      <div>
        <h1>{gameTitle}</h1>
        <h2 className="subtitle">{gameSubTitle}</h2>
      </div>
      <div className="button-group">
        <button className="title-bar-button" onClick={onNewGame}>
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
    </div>
  );
};

export default TitleBar;