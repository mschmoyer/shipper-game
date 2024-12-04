import React, { useEffect, useState, useCallback } from 'react';
import './ship-order-view.css';
import { startShipping } from '../api';
import ProgressBar from './reusable/progress-bar';
import GameWorkButton from './reusable/game-work-button';
import FindTheProductHaystackGame from './minigames/find-the-product-haystack'; // Import the new component

const ShipOrderView = ({
  gameInfo,
  autoShipEnabled,
}) => {
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingError, setShippingError] = useState('');
  const [isAutoShipEnabled, setIsAutoShipEnabled] = useState(autoShipEnabled);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showShipOrderProblemMinigame, setShowShipOrderProblemMinigame] = useState(false); // State to show/hide PackageGrid
  
  const MINIGAME_SPAWN_CHANCE = 0.02;

  const handleShipOrder = useCallback(() => {
    if (isRetrying || gameInfo.orders.length === 0 || !gameInfo.orders.some(order => order.state === 'AwaitingShipment')) {
      return;
    }
    if(Math.random() < MINIGAME_SPAWN_CHANCE) { // 10% chance to show the minigame
      setShowShipOrderProblemMinigame(true);
      return;
    }
    gameInfo.is_shipping = true;
    gameInfo.progress = 0;
    setShippingError('');
    setTimeout(() => {
      setIsRetrying(false);
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              setShippingCost(data.shipping_cost);
            } else {
              setShippingError(data.error);
              gameInfo.is_shipping = false;
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
  }, [gameInfo, isAutoShipEnabled, isRetrying]);

  useEffect(() => {
    if (gameInfo) {
      const hasAutoShipTech = gameInfo.acquired_technologies && gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_warehouse_worker');
      setIsAutoShipEnabled(hasAutoShipTech);
    }
  }, [gameInfo]);

  useEffect(() => {
    if (isAutoShipEnabled && !gameInfo.is_shipping && !isRetrying) {
      console.log('Starting new order automatically on mount, autoShipEnabled:', isAutoShipEnabled);
      handleShipOrder();
    }
  }, [isAutoShipEnabled, gameInfo.is_shipping, handleShipOrder, isRetrying]);

  useEffect(() => {
    if (!gameInfo.is_shipping && isAutoShipEnabled && !isRetrying) {
      setTimeout(handleShipOrder, 10); // Add a one-second delay before
    }
  }, [gameInfo.is_shipping, gameInfo.progress, isAutoShipEnabled, handleShipOrder, isRetrying]);

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
  const totalProfit = gameInfo.product.sales_price - gameInfo.product.cost_to_build - shippingCost;

  return (
    <div className="ship-order-container">
      {showShipOrderProblemMinigame && 
        <FindTheProductHaystackGame onClose={() => setShowShipOrderProblemMinigame(false)} />
      } 
      <div className="ship-button-container">
        <GameWorkButton
          autoShip={isAutoShipEnabled}
          onClick={handleShipOrder}
          isWorkBeingDone={gameInfo.is_shipping}
          titleDefault="Ship"
          titleWhenWorking="Shipping..."
          hotkey="S"
        />
        <div className="product-info">
          <h3>{gameInfo.active_order ? `Order #: ${gameInfo.active_order.id}` : 'Idle'}</h3>
          <div className="cost-info">
            <div className="shipping-info">
              <p>📦 Quantity: {gameInfo.player.products_per_order}</p>
            </div>
            <div className="profit-info">
              <p>📏 Distance: {gameInfo.active_order ? gameInfo.active_order.distance : '--'} miles</p>
              <p>🚚 Shipping: ${gameInfo.active_order ? gameInfo.active_order.shipping_cost : '--'}</p>
            </div>
            {firstItem && (
              <div className="inventory-info">
                <p>💰 Sale Price: ${gameInfo.product.sales_price}</p>
                <p>💵 Est. profit: ${totalProfit}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ship-order-progress-bar-container">
        <ProgressBar
          isError={!!shippingError}
          isActive={gameInfo.is_shipping}
          labelText={shippingError || (gameInfo.is_shipping && gameInfo.active_order && gameInfo.active_order.shipping_steps ? gameInfo.active_order.shipping_steps[Math.floor(gameInfo.progress / (100 / gameInfo.active_order.shipping_steps.length))].name : 'Waiting for an order to ship...')}
          progress={gameInfo.progress}
        />
      </div>
    </div>
  );
};

export default ShipOrderView;