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
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const InfoPanel = ({ gameInfo }) => {
  return (
    <div className="info-panel">
      <div className="info-values">
        <p>🌐 {gameInfo.businessName}</p>
        <p>💰 ${formatCurrency(gameInfo.money)}</p>
        <p>📦 Shipped: {gameInfo.ordersShipped}</p>
        <p>{getReputationEmoji(gameInfo.reputation)} Reputation: {gameInfo.reputation}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
