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
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Business</th>
                  <th>Orders Shipped</th>
                </tr>
              </thead>
              <tbody>
                {ordersShipped.map((player, index) => (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.businessName}</td>
                    <td>{player.ordersShipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="leaderboard-section">
            <h3>Most Money Earned</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Business</th>
                  <th>Total Money Earned</th>
                </tr>
              </thead>
              <tbody>
                {moneyEarned.map((player, index) => (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.businessName}</td>
                    <td>${player.totalMoneyEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="leaderboard-section">
            <h3>Most Advanced Technology</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Business</th>
                  <th>Tech Level</th>
                </tr>
              </thead>
              <tbody>
                {techLevel.map((player, index) => (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.businessName}</td>
                    <td>Level {player.techLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;