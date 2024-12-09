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
  const [isProgressBarActive, setIsProgressBarActive] = useState(false); // New state variable for progress bar
  const [isWorkBeingDone, setIsWorkBeingDone] = useState(false); // New state variable for work being done
  
  const MINIGAME_SPAWN_CHANCE = 0.02;

  const handleShipOrder = useCallback(async () => {
    if (isRetrying || (gameInfo.active_order && gameInfo.active_order.is_shipping)) {
      return;
    }
    setShippingError('');

    console.log('🚚 Shipping order...');

    setIsRetrying(false);
    if(gameInfo.inventory[0].on_hand >= gameInfo.player.products_per_order && 
       !gameInfo.active_order && gameInfo.orders.length > 0) {
      setIsProgressBarActive(true); // Set progress bar active when shipping starts
      setIsWorkBeingDone(true); // Set work being done when shipping starts

      const result = await startShipping()
      .then(data => {
        if (data.message === 'Shipping started successfully.') {
          console.log('🚀 Shipping initiated! Your products are on their way to greatness!');
          setShippingCost(data.shipping_cost);

          // Mini-game logic
          const hasScanToVerifyTech = gameInfo.acquired_technologies && 
            gameInfo.acquired_technologies.some(tech => tech.tech_code === 'scan_to_verify');
          if (!hasScanToVerifyTech && Math.random() < MINIGAME_SPAWN_CHANCE && gameInfo.minigames_enabled) { // Check for scan_to_verify tech
            setShowShipOrderProblemMinigame(true);
            return;
          }
        } else {
          console.log('❌ Failed to start shipping:', data.error);
          setShippingError(data.error);
          if (isAutoShipEnabled) {
            setIsRetrying(true);
            //setTimeout(handleShipOrder, 10000);
          }
        }
      })
      .catch(error => {
        console.error('❌ Failed to start shipping:', error);
        console.log('💥 Something went wrong! Maybe the designer of this game should stick to tic-tac-toe.');
      });
    }
  }, [isRetrying, gameInfo, isAutoShipEnabled]);

  // Do updates when gameInfo arrives
  useEffect(() => {
    if (gameInfo) {
      // Monitor if they have this tech
      const hasAutoShipTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_warehouse_worker');
      if(gameInfo.inventory[0].on_hand <= gameInfo.player.products_per_order) {
        setShippingError('Out of products to ship.'); 
      } else {
        setShippingError('');
      }
      setIsAutoShipEnabled(hasAutoShipTech);
      setIsProgressBarActive(gameInfo.active_order && gameInfo.active_order.is_shipping 
        || (gameInfo.orders_shipped && gameInfo.orders_shipped > 0)); // Update progress bar active status
      setIsWorkBeingDone(gameInfo.active_order && gameInfo.active_order.is_shipping); // Update work being done status
    }
  }, [gameInfo]);

  const getShippingStepName = () => {
    if (gameInfo.active_order && gameInfo.active_order.is_shipping && gameInfo.player.shipping_steps) {
      return gameInfo.player.shipping_steps[Math.floor(gameInfo.active_order.progress / (100 / gameInfo.player.shipping_steps.length))].name;
    }
    if(isAutoShipEnabled) {
      return 'Waiting for orders...';
    } else {
      return 'Ship some orders!';
    }
  };

  const getLabelText = () => {
    if (shippingError) {
      return shippingError;
    }
    return getShippingStepName();
  };

  const player = gameInfo.player;
  const product = gameInfo.product;

  const totalProfit = Math.round((product.sales_price * player.products_per_order) - product.cost_to_build - shippingCost);

  //const progPercent = (player.shipping_duration / 1000) * 100;
  //const progress = (!gameInfo.is_shipping && product.shipping_duration < 1000 ? progPercent : gameInfo.active_order.progress);
  const progress = gameInfo.active_order ? gameInfo.active_order.progress : 0;

  return (
    <div className="ship-order-container">
      {showShipOrderProblemMinigame && 
        <FindTheProductHaystackGame onClose={() => setShowShipOrderProblemMinigame(false)} />
      } 
      <div className="shipping-info">
        <p>📦 Order Items: {player.products_per_order}</p>
        <p>📊 Batch Size: {player.orders_per_ship}</p>
        <p>📏 Distance: {gameInfo.active_order ? gameInfo.active_order.distance : '--'} miles</p>
        <p>🚚 Shipping: ${gameInfo.active_order ? gameInfo.active_order.shipping_cost : '--'}</p>
        <p>💰 Sale Price: ${product.sales_price}</p>
        <p>💵 Profit: ${totalProfit}</p>
      </div>
      <div className="shipping-main-bar">
        <GameWorkButton
          autoShip={isAutoShipEnabled}
          onClick={handleShipOrder}
          isWorkBeingDone={isWorkBeingDone} // Use state variable for work being done status
          titleDefault="Ship"
          titleWhenWorking="Shipping..."
          hotkey="S"
        />
        <ProgressBar
          isError={!!shippingError}
          isActive={isProgressBarActive} // Use state variable for progress bar active status
          labelText={getLabelText()}
          progress={progress}
          speed={player.shipping_duration}
          autoMode={isAutoShipEnabled}
        />
      </div>
    </div>
  );
};

export default ShipOrderView;