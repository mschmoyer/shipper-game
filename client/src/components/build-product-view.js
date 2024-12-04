import React, { useEffect, useState } from 'react';
import './build-product-view.css';
import { startProductBuild } from '../api';
import ProgressBar from './reusable/progress-bar';
import GameWorkButton from './reusable/game-work-button';
import TruckToWarehouseGame from './minigames/truck-to-warehouse-game'; // Import the new component

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

  const ON_HAND_VISIBLE_DURATION = 15000;

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleBuildProduct = async () => {
    if (isRetrying || gameInfo.product.is_building) {
      return;
    }
    gameInfo.product.is_building = true;
    gameInfo.product.progress = 0;
    setBuildError('');

    setIsRetrying(false);
    const result = await startProductBuild()
      .then(data => {
        if (data.message === 'Product build started successfully.') {
          console.log('Product build started successfully:', data);
          if (Math.random() < 0.1) { // 10% chance to show the minigame
            setShowMinigame(true);
          }
        } else {
          console.error('Failed to start product build:', data);
          setBuildError(result.error);
          gameInfo.product.is_building = false;
          if (isAutoBuildEnabled) {
            setIsRetrying(true);
            setTimeout(handleBuildProduct, 10000); // Add a one-second delay before retrying
          }
        }
      })
      .catch(error => console.error('Failed to start product build:', error));
  };

  const handleCheckInventory = () => {
    setIsCheckInventoryModalOpen(true);
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
      if (hasAutoBuildTech) {
        setIsAutoBuildEnabled(true);
      } else {
        setIsAutoBuildEnabled(false);
      }

      const hasInventoryTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'inventory_management');
      setHasInventoryTech(hasInventoryTech);
    }
  }, [gameInfo]);

  useEffect(() => {
    if (isAutoBuildEnabled && !gameInfo.product.is_building && !isRetrying) {
      console.log('Starting new build automatically, autoBuildEnabled:', isAutoBuildEnabled);
      handleBuildProduct();
    }
  }, [isAutoBuildEnabled, gameInfo.product.is_building, isRetrying]);

  useEffect(() => {
    if (!gameInfo.product.isBuilding && isAutoBuildEnabled && !isRetrying) {
      setTimeout(handleBuildProduct, 10); // Add a one-second delay before retrying
    }
  }, [gameInfo.product.is_building, gameInfo.product.progress, isAutoBuildEnabled, isRetrying]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'B' || event.key === 'b') {
        handleBuildProduct();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOnHandCount(false);
    }, ON_HAND_VISIBLE_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const product = gameInfo.product;
  const inventoryAuditProgressBarLabelText = `Manually auditing inventory for ${product.name}...`;

  return (
    <div className="build-product-container">
      <div className="build-button-container">
        <GameWorkButton
          autoShip={isAutoBuildEnabled}
          onClick={handleBuildProduct}
          isWorkBeingDone={product.is_building}
          titleDefault="Build"
          titleWhenWorking="Building..."
          hotkey="B"
        />
        <div className="product-info">
          <h3 onClick={toggleModal}>{product.name}</h3>
          {isModalOpen && (
            <div className="modal">
              <div className="modal-content">
                <span className="close" onClick={toggleModal}>&times;</span>
                <p>📝 Description: {product.description}</p>
                <p>⚖️ Weight: {product.weight} kg</p>
                <p>💵 Cost: ${product.cost_to_build}</p>
                <p>💲 Price: ${product.sales_price}</p>
              </div>
            </div>
          )}
          <div className="cost-info">
            <div className="shipping-info">
              <p>🔢 Quantity: {gameInfo.player.products_per_build}</p>
            </div>
            <div className="profit-info">
              <p>💰 Build Cost: ${product.cost_to_build}</p>
            </div>
            {gameInfo.inventory[0] && (
              <div className="inventory-info">
                {hasInventoryTech ? (
                  <p>📦 {gameInfo.inventory[0].on_hand} on hand</p>
                ) : (
                  showOnHandCount ? (
                    <p className={!hasInventoryTech ? "blurred-value" : ""}>📦 {gameInfo.inventory[0].on_hand} on hand</p>
                  ) : (
                    <button onClick={handleCheckInventory}>Check Inventory</button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isCheckInventoryModalOpen && (
        <div className="check-inventory-modal">
          <div className="modal-content">
            <span className="close" onClick={closeCheckInventoryModal}>&times;</span>
            <p>Knowing how much inventory you have available is important to prevent taking orders you cannot fulfill.  </p>
            {inventoryProgress < 100 ? (
              <ProgressBar 
                isActive={true} 
                progress={inventoryProgress} 
                labelText={inventoryAuditProgressBarLabelText}
              />
            ) : (
              <p>📦 {gameInfo.inventory[0].on_hand} on hand</p>
            )}
            <p>Buy the 🛠️<b>Inventory Tracking</b> technology to see inventory information instantly without having to wait for this!</p>
          </div>
        </div>
      )}
      {showMinigame && (
        <TruckToWarehouseGame onClose={() => setShowMinigame(false)} />
      )}
      <div className='build-product-progress-bar-container'>
        <ProgressBar
          isError={!!buildError}
          isActive={product.is_building}
          labelText={buildError || (product.is_building ? `${product.building_steps[Math.floor(product.progress / (100 / product.building_steps.length))].name} for ${product.name}` : `Waiting for a build of ${product.name}...`)}
          progress={product.progress}
        />
      </div>
      
    </div>
  );
};

export default BuildProductView;