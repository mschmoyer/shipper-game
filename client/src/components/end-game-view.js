import React, { useEffect, useState } from 'react';
import './end-game-view.css';
import { messages } from './messages';
import { generateEndGameText } from '../api';

const getReputationEmoji = (reputation) => {
  if (reputation === 100) return '🌟';
  if (reputation >= 90) return '😁';
  if (reputation >= 80) return '😊';
  if (reputation >= 70) return '🙂';
  if (reputation >= 60) return '😌';
  if (reputation >= 50) return '😐';
  if (reputation >= 40) return '😕';
  if (reputation >= 30) return '😟';
  if (reputation >= 20) return '😢';
  if (reputation >= 10) return '😭';
  return '💀';
};

const EndGameView = ({ gameInfo, onNewGame }) => {
  const [endGameText, setEndGameText] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const fetchEndGameText = async () => {
      setEndGameText([]);
      if(!hasFetched && (!endGameText || endGameText.length === 0)) {
        setEndGameText(['Analyzing behaviors...']);
        const response = await generateEndGameText(gameInfo.acquired_technologies);
        setEndGameText(response.endGameText);
      }
    };
    if (gameInfo.acquired_technologies && !hasFetched) {
      setHasFetched(true);
      fetchEndGameText();
    }
  }, [gameInfo.acquired_technologies, hasFetched]);

  const player = gameInfo.player;
  const message = messages[player.expiration_reason] || messages.time_expired;
  const namePrefix = player.expiration_reason === 'hostile_takeover_by_another_player' ? player.hostile_takeover_player_name : '';

  return (
    <div className="end-game-view">
      <h2>{message.title}</h2>
      <p>{namePrefix} {message.description}</p>

      <h3>🤖 Thoughts from AI Assistant:</h3>
      <ul>
        {(Array.isArray(endGameText) ? endGameText : []).map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>

      <button className="new-game-button" onClick={onNewGame}>Start another one!</button>

      <div className="banner-ad">
        <a href="https://www.shipstation.com" target="_blank" rel="noopener noreferrer" className="banner-link">
          <img src="https://www.shipstation.com/wp-content/uploads/2024/08/shipstation.svg" alt="ShipStation Logo" />
          <p>Want to be this efficient with your shipping?</p>
          <p>Get ShipStation now!</p>
        </a>
      </div>
      <h3>Acquired Technologies:</h3>
      <div className="tech-grid-container">
        {gameInfo.acquired_technologies && gameInfo.acquired_technologies.length > 0 ? (
          gameInfo.acquired_technologies.map((tech, index) => (
            <div key={index} className="end-game-tech-tree-emoji" title={tech.name}>
              {tech.emoji}
            </div>
          ))
        ) : (
          <p>No technologies acquired.</p>
        )}
      </div>  
    </div>
  );
};

export default EndGameView;