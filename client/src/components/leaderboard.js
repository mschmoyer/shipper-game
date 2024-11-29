import React from 'react';
import './leaderboard.css';

const Leaderboard = ({ isOpen, onClose, ordersShipped, moneyEarned, techLevel }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'leaderboard-overlay') {
      onClose();
    }
  };

  return (
    <div className="leaderboard-overlay" onClick={handleOverlayClick}>
      <div className="leaderboard-drawer">
        <button className="close-button" onClick={onClose}>Close</button>
        <h2>Leaderboards</h2>
        <div className="leaderboard-sections">
          <div className="leaderboard-section">
            <h3>Most Orders Shipped</h3>
            <ul>
              {ordersShipped.map((player, index) => (
                <li key={index}>{player.name || player.businessName}: {player.ordersShipped}</li>
              ))}
            </ul>
          </div>
          <div className="leaderboard-section">
            <h3>Most Money Earned</h3>
            <ul>
              {moneyEarned.map((player, index) => (
                <li key={index}>{player.name || player.businessName}: ${player.totalMoneyEarned}</li>
              ))}
            </ul>
          </div>
          <div className="leaderboard-section">
            <h3>Most Advanced Technology</h3>
            <ul>
              {techLevel.map((player, index) => (
                <li key={index}>{player.name || player.businessName}: Level {player.techLevel}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;