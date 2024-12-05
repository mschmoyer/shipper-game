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

  const handleShipOrder = useCallback(async () => {
    if (isRetrying || gameInfo.is_shipping) {
      return;
    }
    gameInfo.is_shipping = true;
    gameInfo.progress = 0;
    setShippingError('');

    setIsRetrying(false);
    const result = await startShipping()
      .then(data => {
        if (data.message === 'Shipping started successfully.') {
          console.log('🚀 Shipping initiated! Your products are on their way to greatness!');
          setShippingCost(data.shipping_cost);
          const hasScanToVerifyTech = gameInfo.acquired_technologies && 
            gameInfo.acquired_technologies.some(tech => tech.tech_code === 'scan_to_verify');
          if (!hasScanToVerifyTech && Math.random() < MINIGAME_SPAWN_CHANCE) { // Check for scan_to_verify tech
            setShowShipOrderProblemMinigame(true);
            return;
          }
        } else {
          console.log('❌ Failed to start shipping:', data.error);
          setShippingError(data.error);
          gameInfo.is_shipping = false;
          if (isAutoShipEnabled) {
            setIsRetrying(true);
            setTimeout(handleShipOrder, 10000);
          }
        }
      })
      .catch(error => {
        console.error('❌ Failed to start shipping:', error);
        console.log('💥 Something went wrong! Maybe the designer of this game should stick to tic-tac-toe.');
      });
  }, [isRetrying, gameInfo, isAutoShipEnabled]);

  // Check if the player has the hire_warehouse_worker tech
  useEffect(() => {
    if (gameInfo) {
      const hasAutoShipTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_warehouse_worker');
      setIsAutoShipEnabled(hasAutoShipTech);
    }
  }, [gameInfo]);

  useEffect(() => {
    if (!gameInfo.is_shipping && isAutoShipEnabled && !isRetrying) {
      console.log('Starting new order automatically on mount, autoShipEnabled:', isAutoShipEnabled);
      handleShipOrder();
    }
  }, [gameInfo.is_shipping, isAutoShipEnabled, isRetrying, handleShipOrder, isRetrying]);

  const getShippingStepName = () => {
    if (gameInfo.is_shipping && gameInfo.active_order && gameInfo.active_order.shipping_steps) {
      return gameInfo.active_order.shipping_steps[Math.floor(gameInfo.progress / (100 / gameInfo.active_order.shipping_steps.length))].name;
    }
    return 'Waiting for an order to ship...';
  };

  const getLabelText = () => {
    if (shippingError) {
      return shippingError;
    }
    return getShippingStepName();
  };

  const firstItem = gameInfo.inventory[0];
  const totalProfit = Math.round((gameInfo.product.sales_price * gameInfo.player.products_per_order) - gameInfo.product.cost_to_build - shippingCost);

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
                <p>💵 Profit: ${totalProfit}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ship-order-progress-bar-container">
        <ProgressBar
          isError={!!shippingError}
          isActive={gameInfo.is_shipping}
          labelText={getLabelText()}
          progress={gameInfo.progress}
          speed={gameInfo.player.shipping_speed}
          autoMode={isAutoShipEnabled}
        />
      </div>
    </div>
  );
};

export default ShipOrderView;