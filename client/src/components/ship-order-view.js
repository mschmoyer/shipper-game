import React, { useEffect, useState } from 'react';
import './ship-order-view.css';
import { startShipping } from '../api';
import ProgressBar from './progress-bar';
import GameWorkButton from './game-work-button';

const ShipOrderView = ({
  gameInfo,
  autoShipEnabled,
}) => {
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingError, setShippingError] = useState('');

  const handleShipOrder = () => {
    if (gameInfo.orders.length === 0 || !gameInfo.orders.some(order => order.state === 'AwaitingShipment')) {
      return;
    }
    gameInfo.isShipping = true;
    gameInfo.progress = 0;
    setShippingError('');
    setTimeout(() => {
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              setShippingCost(data.shippingCost);
            } else if (data.error === 'Not enough inventory to fulfill the order') {
              setShippingError('❗ Not enough inventory to fulfill order!');
              gameInfo.isShipping = false;
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
    const handleKeyPress = (event) => {
      if (event.key === 'S' || event.key === 's') {
        handleShipOrder();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const firstItem = gameInfo.inventory[0];
  const totalProfit = gameInfo.product.salesPrice - gameInfo.product.costToBuild;

  return (
    <div className="ship-order-container">
      <div className="ship-button-container">
        <GameWorkButton
          autoShip={autoShipEnabled}
          onClick={handleShipOrder}
          isWorkBeingDone={gameInfo.isShipping}
          titleDefault="Ship Order"
          titleWhenWorking="Working..."
          hotkey="S"
        />
        <div className="product-info">
          <h3>{gameInfo.activeOrder ? `Order #: ${gameInfo.activeOrder.id}` : 'Idle'}</h3>
          <div className="cost-info">
            <div className="shipping-info">
              <p>📦 Quantity: 1</p>
            </div>
            <div className="profit-info">
              <p>📏 Distance: {gameInfo.activeOrder ? gameInfo.activeOrder.distance : '--'} miles</p>
              <p>🚚 Shipping: ${gameInfo.activeOrder ? gameInfo.activeOrder.shippingCost : '--'}</p>
            </div>
            {firstItem && (
              <div className="inventory-info">
                <p>💰 Sale Price: ${gameInfo.product.salesPrice}</p>
                <p>💵 Est. profit: ${totalProfit}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProgressBar
        isError={!!shippingError}
        isActive={gameInfo.isShipping}
        labelText={shippingError || (gameInfo.isShipping ? gameInfo.shippingSteps[Math.floor(gameInfo.progress / (100 / gameInfo.shippingSteps.length))].name : 'Waiting for an order to ship...')}
        progress={gameInfo.progress}
      />
    </div>
  );
};

export default ShipOrderView;