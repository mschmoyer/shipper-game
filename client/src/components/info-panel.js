import React from 'react';
import './info-panel.css';

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

const formatCurrency = (amount) => {
  if (amount === null) return 'N/A';
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatTimeRemaining = (timeRemaining) => {
  return timeRemaining > 60 ? `${Math.floor(timeRemaining / 60)} mins` : `${timeRemaining}s`;
};

const InfoPanel = ({ gameInfo }) => {
  const player = gameInfo.player;
  return (
    <div className="info-panel">
      <div className="info-values">
        <p>🌐 {player.businessName}</p>
        <p>💰 ${formatCurrency(player.money)}</p>
        <p>📦 Shipped: {player.ordersShipped}</p>
        <p>{getReputationEmoji(player.reputation)} Reputation: {player.reputation}</p>
        <p>⏳ Time Remaining: {formatTimeRemaining(gameInfo.timeRemaining)}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
