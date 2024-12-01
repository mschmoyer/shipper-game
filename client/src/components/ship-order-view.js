import React, { useEffect, useState } from 'react';
import './ship-order-view.css';
import { startShipping } from '../api'; // Import startShipping API

const ShipOrderView = ({
  gameInfo,
  autoShipEnabled,
  setShippingCost,
  setTotalCost,
  isModalOpen,
  toggleModal
}) => {
  const [boxPosition, setBoxPosition] = useState(0);

  const handleShipOrder = () => {
    if (gameInfo.orders.length === 0 || !gameInfo.orders.some(order => order.state === 'AwaitingShipment')) {
      return;
    }
    gameInfo.isShipping = true;
    gameInfo.progress = 0;
    setTimeout(() => {
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              setShippingCost(data.shippingCost);
              setTotalCost(data.shippingCost + gameInfo.product.costToBuild);
            } else {
              console.error('Failed to start shipping');
            }
          })
          .catch(error => console.error('Failed to start shipping:', error));
      }, 0);
    }, 0);
  };

  useEffect(() => {
    if (autoShipEnabled && !gameInfo.isShipping) {
      console.log('Starting new order automatically on mount');
      handleShipOrder();
    }
  }, [autoShipEnabled]);

  useEffect(() => {
    if (!gameInfo.isShipping) {
      if (autoShipEnabled) {
        setTimeout(handleShipOrder, 0);
      }
    }
  }, [gameInfo.isShipping, gameInfo.progress, autoShipEnabled]);

  useEffect(() => {
    if (gameInfo.isShipping) {
      const interval = setInterval(() => {
        setBoxPosition(gameInfo.progress);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameInfo.isShipping, gameInfo.progress]);

  const firstItem = gameInfo.inventory[0];

  return (
    <div className="ship-order-container">
      <div className="ship-button-container">
        <button
          className={`ship-button ${autoShipEnabled ? 'auto-ship' : ''}`}
          onClick={handleShipOrder}
          disabled={gameInfo.isShipping}
        >
          {autoShipEnabled ? 'Working...' : gameInfo.isShipping ? 'Working...' : 'Ship Order'}
        </button>
        <div className="product-info">
          <h3 onClick={toggleModal}>{gameInfo.product.name}</h3>
          {isModalOpen && (
            <div className="modal">
              <div className="modal-content">
                <span className="close" onClick={toggleModal}>&times;</span>
                <p>📝 Description: {gameInfo.product.description}</p>
                <p>⚖️ Weight: {gameInfo.product.weight} kg</p>
                <p>💵 Cost: ${gameInfo.product.costToBuild}</p>
                <p>💲 Price: ${gameInfo.product.salesPrice}</p>
              </div>
            </div>
          )}
          <div className="cost-info">
            <div className="shipping-info">
              <p>📦 Quantity: 1</p>
              <p>📏 Distance: {gameInfo.orders.length > 0 ? gameInfo.orders[0].distance : '--'} miles</p>
              <p>🚚 Shipping: ${gameInfo.shippingCost}</p>
            </div>
            <div className="profit-info">
              <p>📦 Build Cost: ${gameInfo.totalCost}</p>
              <p>💰 Sale Price: ${gameInfo.product.salesPrice}</p>
              <p>💵 Est. profit: ${gameInfo.product.salesPrice - gameInfo.totalCost}</p>
            </div>
            {firstItem && (
              <div className="inventory-info">
                <p>📦 {firstItem.onHand} on hand</p>
                <p>💔 {firstItem.damaged} damaged</p>
                <p>🚚 {firstItem.inTransit} in transit</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="progress-bar-container">
        <div className={`progress-bar ${gameInfo.isShipping ? 'smooth' : ''}`} style={{ width: `${gameInfo.isShipping ? gameInfo.progress : 0}%` }}></div>
        <div className="shipping-state">
          {gameInfo.isShipping ? gameInfo.shippingSteps[Math.floor(gameInfo.progress / (100 / gameInfo.shippingSteps.length))].name : ''}
        </div>
      </div>
    </div>
  );
};

export default ShipOrderView;