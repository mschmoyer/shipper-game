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
  const [isActive, setIsActive] = useState(false);
  const [lastShipTimestamp, setLastShipTimestamp] = useState(0);
  
  const MINIGAME_SPAWN_CHANCE = 0.02;

  // function to re-enable the button after the shipping duration
  const reEnableButton = () => {
    setIsActive(false);
  }

  const handleShipOrder = useCallback(async () => {
    if (isRetrying || (gameInfo.active_order && gameInfo.active_order.is_shipping)) {
      return;
    }
    //setShippingError('');

    console.log('🚚 Shipping order...');

    //setIsRetrying(false);

    const did_shipping_duration_elapse = Date.now() - lastShipTimestamp > gameInfo.player.shipping_duration;

    if((gameInfo.inventory[0].on_hand >= gameInfo.player.products_per_order && 
      !gameInfo.active_order && gameInfo.orders.length > 0) 
      || (!shippingError && did_shipping_duration_elapse)) {
      setIsActive(true); // Set work being done when shipping starts
      
      // setTimeout to set isActive to false after shipping duration
      setTimeout(reEnableButton, gameInfo.player.shipping_duration);

      const result = await startShipping()
      .then(data => {
        if (data.message === 'Shipping started successfully.') {
          console.log('🚀 Shipping initiated! Your products are on their way to greatness!');
          setShippingCost(data.shipping_cost);
          setLastShipTimestamp(Date.now()); 

          // Mini-game logic
          const hasScanToVerifyTech = gameInfo.acquired_technologies && 
            gameInfo.acquired_technologies.some(tech => tech.tech_code === 'scan_to_verify');
          if (!hasScanToVerifyTech && Math.random() < MINIGAME_SPAWN_CHANCE 
              && gameInfo.minigames_enabled) {
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

      const showActive = (gameInfo.active_order && gameInfo.active_order.is_shipping)
        || (gameInfo.ordersShipped && gameInfo.ordersShipped > 0 && hasAutoShipTech)
        && gameInfo.inventory[0].on_hand >= gameInfo.player.products_per_order
        ** gameInfo.orders.length > 0;

      console.log('gameInfo.ordersShipped:', gameInfo.ordersShipped, 'hasAutoShipTech:', hasAutoShipTech);
      setIsAutoShipEnabled(hasAutoShipTech);
      setIsActive(showActive);
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
  const order = gameInfo.active_order;
  
  const total_shipping_cost = player.shipping_cost_per_mile * player.shipping_distance;

  const totalProfit = Math.round((product.sales_price * player.products_per_order) 
        - (product.cost_to_build * player.products_per_order) 
        - total_shipping_cost);

  const isHighShippingCost = total_shipping_cost >= 0.4 * totalProfit;

  const progPercent = (player.shipping_duration / 1000) * 100;
  //const progress = (!gameInfo.is_shipping && product.shipping_duration < 1000 ? progPercent : gameInfo.active_order.progress);
  const progress = progPercent || 0;

  return (
    <div className="ship-order-container">
      {player.products_built < 10 ? (
        <div className="initial-state-box">
          Build 10 products to begin shipping
        </div>
      ) : (
        <>
          {showShipOrderProblemMinigame && 
            <FindTheProductHaystackGame onClose={() => setShowShipOrderProblemMinigame(false)} />
          } 
          <div className="shipping-info">
            <p>📦 Order Items: {player.products_per_order}</p>
            <p>📊 Batch Size: {player.orders_per_ship}</p>
            <p>📫 Distance: {player.shipping_distance} miles</p>
            <p className={isHighShippingCost ? 'high-shipping-cost' : ''}>
              🚚 Shipping: ${total_shipping_cost}
              {isHighShippingCost && <span className="freaked-out-emoji">😱</span>}
              {!isHighShippingCost && <span className="freaked-out-emoji">😄</span>}
            </p>
            <p>💰 Sale Price: ${product.sales_price}</p>
            <p>💵 Profit: ${totalProfit}</p>
          </div>
          <div className="shipping-main-bar">
            <GameWorkButton
              autoShip={isAutoShipEnabled}
              onClick={handleShipOrder}
              isWorkBeingDone={isActive} // Use state variable for work being done status
              titleDefault="Ship"
              titleWhenWorking="Shipping..."
              hotkey="S"
            />
            <ProgressBar
              isError={!!shippingError}
              isActive={isActive} // Use state variable for progress bar active status
              labelText={getLabelText()}
              progress={progress}
              speed={player.shipping_duration}
              autoMode={isAutoShipEnabled}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ShipOrderView;