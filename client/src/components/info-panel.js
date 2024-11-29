import React from 'react';

const InfoPanel = ({ gameInfo }) => {
  return (
    <div className="info-panel">
      <h1>Shipping Game</h1>
      <div className="info-values">
        <p>📦 Business: {gameInfo.businessName}</p>
        <p>💰 Money: ${gameInfo.money}</p>
        <p>🛠️ Tech Points: {gameInfo.techPoints}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
