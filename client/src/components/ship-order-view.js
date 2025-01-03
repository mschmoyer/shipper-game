import React, { useEffect, useState, useCallback } from 'react';
import './ship-order-view.css';
import { startShipping } from '../api';
import GameWorkView from './reusable/game-work-view';
import FindTheProductHaystackGame from './minigames/find-the-product-haystack';

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

  const checkMiniGame = () => {
      // Mini-game logic
      const hasScanToVerifyTech = gameInfo.acquired_technologies && 
      gameInfo.acquired_technologies.some(tech => tech.tech_code === 'scan_to_verify');
    if (!hasScanToVerifyTech && Math.random() < MINIGAME_SPAWN_CHANCE 
        && gameInfo.minigames_enabled) {
      setShowShipOrderProblemMinigame(true);
      return;
    }
  }

  const handleShipOrder = useCallback(async () => {
    if (isRetrying || (gameInfo.active_order && gameInfo.active_order.is_shipping)) {
      return;
    }

    const did_shipping_duration_elapse = Date.now() - lastShipTimestamp > gameInfo.business.shipping_duration;

    if((gameInfo.inventory >= gameInfo.business.products_per_order 
        && !gameInfo.active_order 
        && gameInfo.orders.length > 0) 
        || (!shippingError && did_shipping_duration_elapse)) 
    {
      setIsActive(true);
      setTimeout(reEnableButton, gameInfo.business.shipping_duration);
      await startShipping()
      .then(data => {
        if (data.message === 'Shipping started successfully.') {
          setShippingCost(data.shipping_cost);
          setLastShipTimestamp(Date.now()); 
          checkMiniGame();
        } else {
          console.log('❌ Failed to start shipping:', data.error);
          setShippingError(data.error);
          setIsRetrying(isAutoShipEnabled);
        }
      })
      .catch(error => {
        setShippingError(error.message);
        setIsRetrying(isAutoShipEnabled);
      });
    }
  }, [isRetrying, gameInfo, isAutoShipEnabled]);

  
  useEffect(() => { // Do updates when gameInfo arrives
    if (gameInfo) {
      const hasAutoShipTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_warehouse_worker');
      if(gameInfo.inventory <= gameInfo.business.products_per_order) {
        setShippingError('Out of products to ship.'); 
      } else {
        setShippingError('');
      }

      const showActive = (gameInfo.active_order && gameInfo.active_order.is_shipping)
        || (gameInfo.ordersShipped && gameInfo.ordersShipped > 0 && hasAutoShipTech)
        && gameInfo.inventory >= gameInfo.business.products_per_order
        ** gameInfo.orders.length > 0;

      setIsAutoShipEnabled(hasAutoShipTech);
      setIsActive(showActive);
    }
  }, [gameInfo]);

  const getShippingStepName = () => {
    if (gameInfo.active_order && gameInfo.active_order.is_shipping && gameInfo.business.shipping_steps) {
      return gameInfo.business.shipping_steps[Math.floor(gameInfo.active_order.progress / (100 / gameInfo.business.shipping_steps.length))].name;
    }
    if(isAutoShipEnabled) {
      return 'Waiting for orders...';
    } else {
      return `Ship ${gameInfo.business.orders_per_ship}x order${gameInfo.business.orders_per_ship > 1 ? 's' : ''}`;
    }
  };

  const getLabelText = () => {
    if (shippingError) {
      return shippingError;
    }
    return getShippingStepName();
  };

  const business = gameInfo.business;
  const product = gameInfo.product;
  
  const total_shipping_cost = business.shipping_cost_per_mile * business.shipping_distance;

  const totalProfit = Math.round((product.sales_price * business.products_per_order) 
        - (product.cost_to_build * business.products_per_order) 
        - total_shipping_cost);

  const isHighShippingCost = total_shipping_cost >= 0.4 * totalProfit;

  const progPercent = (business.shipping_duration / 1000) * 100;
  const progress = progPercent || 0;

  const infoItems = [
    { key: 'Batch Size', value: business.orders_per_ship, emoji: '📊' },
    { key: 'Order Items', value: business.products_per_order, emoji: '📦' },
    { key: 'Sale Price', value: `$${product.sales_price}`, emoji: '💰' },
    { key: 'Profit', value: `$${totalProfit}`, emoji: '💵' },
  ];

  const quantity = gameInfo && gameInfo.orders ? gameInfo.orders.length : 0;

  return (
    <div className="ship-order-container">
      {business.products_built < 6 ? (
        <div className="initial-state-box">
          Build 6 {gameInfo && gameInfo.product ? gameInfo.product.name : ''} to unlock...
        </div>
      ) : (
        <>
          {showShipOrderProblemMinigame && 
            <FindTheProductHaystackGame onClose={() => setShowShipOrderProblemMinigame(false)} />
          } 
          <GameWorkView
            name="Shipping"
            emoji="🚚"
            quantity={quantity}
            infoItems={infoItems}
            isEnabled={!shippingError}
            isClickable={!isActive}
            isAutomated={isAutoShipEnabled}
            progress={progress}
            speed={business.shipping_duration}
            progressBarLabelText={getLabelText()}
            progressBarMouseUp={handleShipOrder}
          />
        </>
      )}
    </div>
  );
};

export default ShipOrderView;