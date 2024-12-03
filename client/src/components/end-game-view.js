import React from 'react';
import './end-game-view.css';

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
  const formatMoney = (money) => {
    return money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (!gameInfo || !gameInfo.player) {
    return <div className="end-game-view">Game information is not available.</div>;
  }

  const player = gameInfo.player;

  return (
    <div className="end-game-view">
      <h1>Congratulations, {player.businessName}!</h1>
      <p>You have successfully completed the game. Here are your final stats:</p>
      <div className="stats-grid">
        <div><strong>Money:</strong> 💰 ${formatMoney(player.final_money)}</div>
        <div><strong>Tech Level:</strong> 🖥️ {player.final_tech_level}</div>
        <div><strong>Orders:</strong> 📦 {player.final_orders_shipped}</div>
        <div><strong>Reputation:</strong> {getReputationEmoji(player.final_reputation)} {player.final_reputation}</div>
      </div>
      <h2>Acquired Technologies:</h2>
      <div className="tech-table-container">
        {gameInfo.acquired_technologies ? (
          <table className="tech-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cost</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {gameInfo.acquired_technologies.map((tech, index) => (
                <tr key={index}>
                  <td>{tech.name}</td>
                  <td>${formatMoney(tech.cost)}</td>
                  <td>{tech.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No technologies acquired.</p>
        )}
      </div>
      <button className="new-game-button" onClick={onNewGame}>Start a New Business</button>
    </div>
  );
};

export default EndGameView;