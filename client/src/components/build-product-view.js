import React, { useEffect, useState, useCallback } from 'react';
import './build-product-view.css';
import { startProductBuild } from '../api';
import GameWorkView from './reusable/game-work-view';

const BuildProductView = ({ 
  gameInfo,
  product,
  autoBuildEnabled 
}) => {
  const [buildError, setBuildError] = useState('');
  const [isAutoBuildEnabled, setIsAutoBuildEnabled] = useState(autoBuildEnabled);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleBuildProduct = useCallback(async () => {
    if (isRetrying || product.is_building) {
      return;
    }
    product.is_building = true;
    product.progress = 0;
    setBuildError('');
    setIsActive(true);
    setIsRetrying(false);

    await startProductBuild(product.id)
      .then(data => {
        if (!data.message === 'Product build started successfully.') {
          setBuildError(data.error);
          product.is_building = false;
          setIsRetrying(isAutoBuildEnabled);
        }
      })
      .catch(error => {
        setBuildError(error.message);
        setIsRetrying(isAutoBuildEnabled);
      });
  }, [isRetrying, gameInfo, product, isAutoBuildEnabled]);

  const handleGameWorkButtonClick = useCallback(async () => {
    if (!isAutoBuildEnabled) {
      handleBuildProduct();
    }    
  }, [isRetrying, isAutoBuildEnabled, handleBuildProduct]);

  // Check if the business has the AutoBuild technology
  useEffect(() => {
    if (gameInfo) {
      const hasAutoBuildTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_fabricator' &&
        product.cost_to_build <= 50);
      setIsAutoBuildEnabled(hasAutoBuildTech);

      const showActive = product.is_building 
      || (gameInfo.business.products_built && gameInfo.business.products_built > 0 && hasAutoBuildTech);

      setIsActive(showActive);
    }
  }, [gameInfo, product]);

  console.log('product:', product);
  const business = gameInfo.business;
  const progPercent = (product.building_duration / 1000) * 100;
  const progress = progPercent || 0;

  let current_step = Math.floor(product.progress / (100 / business.building_steps.length));
  current_step = Math.max(business.building_steps.length-1, current_step);
  current_step = Math.min(0, current_step);

  const labelText = buildError || 
    (product.is_building ? `${business.building_steps[current_step].name}` 
    : `Build ${business.products_per_build}x ${product.name}`);

  const infoItems = [];
  // const infoItems = [
  //   { key: 'Built Qty', value: gameInfo.business.products_per_build, emoji: '🔢' },
  //   { key: 'Build Cost', value: `$${product.cost_to_build}`, emoji: '💰' },
  //   { key: 'On Hand', value: gameInfo.inventory, emoji: '📦' }
  // ];

  const nameValue = `${product.name} - $${product.cost_to_build * product.quantity_per_build}`;

  return (
    <div className="build-product-container">
      {(product.cost_to_build > 50 && business.total_money_earned < product.cost_to_build * 10) ? (
        <div className="initial-state-box">
          Earn to ${product.cost_to_build * 10} to unlock...
        </div>
      ) : (
        <GameWorkView
          name={nameValue}
          emoji={product.emoji}
          quantity={product.on_hand}
          infoItems={infoItems}
          isEnabled={!buildError}
          isClickable={!isActive}
          isAutomated={isAutoBuildEnabled}
          progress={progress}
          speed={business.building_duration}
          progressBarLabelText={labelText}
          progressBarMouseUp={handleGameWorkButtonClick}
        />
      )}
    </div>
  );
};

export default BuildProductView;