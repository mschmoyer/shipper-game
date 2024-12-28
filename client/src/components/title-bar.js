import React, { useState } from 'react';
import './title-bar.css';
import gameTitleImage from '../images/game-title.png'; // Adjust the path if you move the image
import Leaderboard from './leaderboard';
import HowToPlay from './how-to-play';

const TitleBar = ({ onEndGame, isGameActive, gameInfo }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

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

  const toggleLeaderboard = () => {
    setIsLeaderboardOpen(!isLeaderboardOpen);
  };

  const toggleHowToPlay = () => {
    setIsHowToPlayOpen(!isHowToPlayOpen);
  };

  return (
    <div className="title-bar">
      <div>
        <img src={gameTitleImage} alt="Game Title" className="game-title-image" />
      </div>
      {gameInfo && (
        <div className="title-business-info">    
          <p>{gameInfo.business.business_name}</p>
          <p>Owner: {gameInfo.business.name}</p>
        </div>
      )}
      <div className="button-group">
        {isGameActive && (
          <button className="title-bar-button" onClick={handleEndGameClick}>
            <span role="img" aria-label="End Game">🛑</span>
            <span>Abandon</span>
          </button>
        )}
        <button className="title-bar-button" onClick={toggleLeaderboard}>
          <span role="img" aria-label="Leaderboard">📊</span>
          <span>Leaders</span>
        </button>
        <button className="title-bar-button" onClick={toggleHowToPlay}>
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
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
      <HowToPlay
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </div>
  );
};

export default TitleBar;