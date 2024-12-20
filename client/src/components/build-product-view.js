import React, { useEffect, useState, useCallback } from 'react';
import './build-product-view.css';
import { startProductBuild } from '../api';
import GameWorkView from './reusable/game-work-view';
import TruckToWarehouseGame from './minigames/truck-to-warehouse-game';

const BuildProductView = ({ 
  gameInfo, 
  autoBuildEnabled 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [isAutoBuildEnabled, setIsAutoBuildEnabled] = useState(autoBuildEnabled);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasInventoryTech, setHasInventoryTech] = useState(false);
  const [isCheckInventoryModalOpen, setIsCheckInventoryModalOpen] = useState(false);
  const [inventoryProgress, setInventoryProgress] = useState(0);
  const [showMinigame, setShowMinigame] = useState(false);
  const [showOnHandCount, setShowOnHandCount] = useState(true);
  const [hasPurchaseOrderTech, setHasPurchaseOrderTech] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const ON_HAND_VISIBLE_DURATION = 15000;
  const MINIGAME_SPAWN_CHANCE = 0.02; // Update spawn chance to 2%

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleBuildProduct = useCallback(async () => {
    if (!gameInfo.game_active || isRetrying || gameInfo.product.is_building) {
      return;
    }
    gameInfo.product.is_building = true;
    gameInfo.product.progress = 0;
    setBuildError('');
    setIsActive(true);
    setIsRetrying(false);

    await startProductBuild()
      .then(data => {
        if (data.message === 'Product build started successfully.') {
          if (Math.random() < MINIGAME_SPAWN_CHANCE && gameInfo.minigames_enabled && !hasPurchaseOrderTech) { // 2% chance to show the minigame
            setShowMinigame(true);
          }
        } else {
          setBuildError(data.error);
          gameInfo.product.is_building = false;
          setIsRetrying(isAutoBuildEnabled);
        }
      })
      .catch(error => {
        setBuildError(error.message);
        setIsRetrying(isAutoBuildEnabled);
      });
  }, [isRetrying, gameInfo, isAutoBuildEnabled]);

  const handleGameWorkButtonClick = useCallback(async () => {
    if (!isAutoBuildEnabled) {
      handleBuildProduct();
    }    
  }, [isRetrying, isAutoBuildEnabled, handleBuildProduct]);

  const handleCheckInventory = () => {
    setShowOnHandCount(false);
    setInventoryProgress(0);
    const interval = setInterval(() => {
      setInventoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowOnHandCount(true);
          setTimeout(() => setShowOnHandCount(false), ON_HAND_VISIBLE_DURATION);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const closeCheckInventoryModal = () => {
    setIsCheckInventoryModalOpen(false);
  };

  // Check if the player has the AutoBuild technology
  useEffect(() => {
    if (gameInfo) {
      const hasAutoBuildTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_fabricator');
      setIsAutoBuildEnabled(hasAutoBuildTech);

      const hasInventoryTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'inventory_management');
      setHasInventoryTech(hasInventoryTech);

      const hasPurchaseOrderTech = gameInfo.acquired_technologies &&
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'purchase_orders');
      setHasPurchaseOrderTech(hasPurchaseOrderTech);

      const showActive = gameInfo.product.is_building 
      || (gameInfo.player.products_built && gameInfo.player.products_built > 0 && hasAutoBuildTech);

      setIsActive(showActive);
    }
  }, [gameInfo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOnHandCount(false);
    }, ON_HAND_VISIBLE_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if ((event.key === 'C' || event.key === 'c') && !showOnHandCount && inventoryProgress === 0) {
        handleCheckInventory();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [showOnHandCount, inventoryProgress]);

  const product = gameInfo.product;
  console.log('product:', product);
  const player = gameInfo.player;
  const inventoryAuditProgressBarLabelText = `Manually auditing inventory...`;

  const progPercent = (product.building_duration / 1000) * 100;
  const progress = progPercent || 0;

  let current_step = Math.floor(product.progress / (100 / player.building_steps.length));
  current_step = Math.max(player.building_steps.length-1, current_step);
  current_step = Math.min(0, current_step);

  const labelText = buildError || 
    (product.is_building ? `${player.building_steps[current_step].name}` 
    : `Build some products!`);

  const infoItems = [
    { key: 'Built Qty', value: gameInfo.player.products_per_build, emoji: '🔢' },
    { key: 'Build Cost', value: `$${product.cost_to_build}`, emoji: '💰' },
    { key: 'On Hand', value: gameInfo.inventory[0].on_hand, emoji: '📦' }
  ];

  return (
    <div className="build-product-container">
      <div className="build-product-info">
        <h3 onClick={toggleModal}>
          <span className="build-product-emoji">{product.emoji}</span> {product.name}
        </h3>
      </div>
      <GameWorkView
        infoItems={infoItems}
        isEnabled={!buildError}
        isClickable={!isActive}
        isAutomated={isAutoBuildEnabled}
        onClick={handleGameWorkButtonClick}
        buttonTitle="Build"
        buttonTitleBusy="Building..."
        hotkey="B"
        progress={progress}
        speed={player.building_duration}
        progressBarLabelText={labelText}
      />
    </div>
  );
};

export default BuildProductView;