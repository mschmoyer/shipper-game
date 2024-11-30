import React from 'react';
import './info-panel.css';

const InfoPanel = ({ gameInfo }) => {
  return (
    <div className="info-panel">
      <h1>Shipping Game</h1>
      <div className="info-values">
        <p>🌐 {gameInfo.businessName}</p>
        <p>💰 ${gameInfo.money}</p>
        <p>📦 Shipped: {gameInfo.ordersShipped}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
