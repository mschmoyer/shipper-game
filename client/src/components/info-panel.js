import React from 'react';

const InfoPanel = ({ gameInfo }) => {
  const firstItem = gameInfo.inventory[0];

  return (
    <div className="info-panel">
      <h1>Shipping Game</h1>
      <div className="info-values">
        <p>📦 Business: {gameInfo.businessName}</p>
        <p>💰 Money: ${gameInfo.money}</p>
        <p>📦 Orders Shipped: {gameInfo.ordersShipped}</p>
        <p>💵 Total Revenue: ${gameInfo.totalMoneyEarned}</p>
      </div>
      {firstItem && (
        <div className="inventory-values">
          <p>Inventory: </p>
          <p>📦 {firstItem.onHand} on hand</p>
          <p>💔 {firstItem.damaged} damaged</p>
          <p>🚚 {firstItem.inTransit} in transit</p>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
