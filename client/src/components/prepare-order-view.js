
import React, { useEffect, useState, useCallback } from 'react';
import './prepare-order-view.css';
import GameWorkView from './reusable/game-work-view';

const PrepareOrderView = ({ gameInfo }) => {
  const [preparationError, setPreparationError] = useState('');
  const [isAutoPrepareEnabled, setIsAutoPrepareEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handlePrepareOrder = useCallback(async () => {
    if (isActive) {
      return;
    }

    setIsActive(true);
    // Simulate order preparation logic
    setTimeout(() => {
      setIsActive(false);
    }, gameInfo.business.preparation_duration);
  }, [isActive, gameInfo]);

  useEffect(() => {
    if (gameInfo) {
      const hasAutoPrepareTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'auto_prepare');
      setIsAutoPrepareEnabled(hasAutoPrepareTech);
    }
  }, [gameInfo]);

  const getLabelText = () => {
    if (preparationError) {
      return preparationError;
    }
    return isAutoPrepareEnabled ? 'Preparing orders automatically...' : 'Prepare some orders!';
  };

  const business = gameInfo.business;
  const total_shipping_cost = business.shipping_cost_per_mile * business.shipping_distance;

  const infoItems = [
    { key: 'Batch Qty', value: business.orders_per_ship, emoji: '📊' },
    { key: 'Order Items', value: business.products_per_order, emoji: '📦' },
    { key: 'Shipping Cost', value: `$${total_shipping_cost}`, emoji: '🚚' },
    { key: 'Distance', value: `${business.shipping_distance} miles`, emoji: '📫' },
  ];

  const progress = (business.preparation_duration / 1000) * 100;

  return (
    <div className="prepare-order-container">
      <GameWorkView
        infoItems={infoItems}
        isEnabled={!preparationError}
        isClickable={!isActive}
        isAutomated={isAutoPrepareEnabled}
        onClick={handlePrepareOrder}
        buttonTitle="Prepare"
        buttonTitleBusy="Preparing..."
        hotkey="P"
        progress={progress}
        speed={business.preparation_duration}
        progressBarLabelText={getLabelText()}
      />
    </div>
  );
};

export default PrepareOrderView;