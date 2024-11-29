import React from 'react';

const InfoPanel = ({ gameInfo }) => {
  return (
    <div className="info-panel">
      <h1>Shipping Game</h1>
      <div className="info-values">
        <p>📦 Business: {gameInfo.businessName}</p>
        <p>💰 Money: ${gameInfo.money}</p>
        <p>📦 Orders Shipped: {gameInfo.ordersShipped}</p>
        <p>💵 Total Revenue: ${gameInfo.totalMoneyEarned}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
