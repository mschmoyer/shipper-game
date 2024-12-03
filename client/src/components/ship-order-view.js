import React, { useEffect, useState, useCallback } from 'react';
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
  const [isAutoShipEnabled, setIsAutoShipEnabled] = useState(autoShipEnabled);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleShipOrder = useCallback(() => {
    if (isRetrying || gameInfo.orders.length === 0 || !gameInfo.orders.some(order => order.state === 'AwaitingShipment')) {
      return;
    }
    gameInfo.isShipping = true;
    gameInfo.progress = 0;
    setShippingError('');
    setTimeout(() => {
      setIsRetrying(false);
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              setShippingCost(data.shippingCost);
            } else {
              setShippingError('❗ Not enough inventory to fulfill order!');
              gameInfo.isShipping = false;
              if (isAutoShipEnabled) {
                setIsRetrying(true);
                console.log('isRetrying:', isRetrying);
                setTimeout(handleShipOrder, 10000); // Add a one-second delay before retrying
              }
            }
          })
          .catch(error => console.error('Failed to start shipping:', error));
      }, 0);
    }, 0);
  }, [gameInfo, isAutoShipEnabled]);

  useEffect(() => {
    if (gameInfo) {
      const hasAutoShipTech = gameInfo.acquiredTechnologies && gameInfo.acquiredTechnologies.some(tech => tech.techCode === 'hire_warehouse_worker');
      setIsAutoShipEnabled(hasAutoShipTech);
    }
  }, [gameInfo]);

  useEffect(() => {
    if (isAutoShipEnabled && !gameInfo.isShipping && !isRetrying) {
      console.log('Starting new order automatically on mount, autoShipEnabled:', isAutoShipEnabled);
      handleShipOrder();
    }
  }, [isAutoShipEnabled, gameInfo.isShipping, handleShipOrder, isRetrying]);

  useEffect(() => {
    if (!gameInfo.isShipping && isAutoShipEnabled && !isRetrying) {
      setTimeout(handleShipOrder, 10); // Add a one-second delay before
    }
  }, [gameInfo.isShipping, gameInfo.progress, isAutoShipEnabled, handleShipOrder, isRetrying]);

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
  }, [handleShipOrder]);

  const firstItem = gameInfo.inventory[0];
  const totalProfit = gameInfo.product.salesPrice - gameInfo.product.costToBuild - shippingCost;

  return (
    <div className="ship-order-container">
      <div className="ship-button-container">
        <GameWorkButton
          autoShip={isAutoShipEnabled}
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
              <p>📦 Quantity: {gameInfo.player.productsPerOrder}</p>
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