import React, { useEffect, useState } from 'react';
import './build-product-view.css';
import { startProductBuild } from '../api';
import ProgressBar from './progress-bar';
import GameWorkButton from './game-work-button';

const BuildProductView = ({ 
  gameInfo, 
  autoBuildEnabled 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [isAutoBuildEnabled, setIsAutoBuildEnabled] = useState(autoBuildEnabled);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasInventoryTech, setHasInventoryTech] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryProgress, setInventoryProgress] = useState(0);

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
    setIsInventoryModalOpen(true);
    setInventoryProgress(0);
    const interval = setInterval(() => {
      setInventoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const closeInventoryModal = () => {
    setIsInventoryModalOpen(false);
  };

  // Check if the player has the AutoBuild technology
  useEffect(() => {
    if (gameInfo) {
      const hasAutoBuildTech = gameInfo.acquired_technologies && 
        gameInfo.acquired_technologies.some(tech => tech.tech_code === 'hire_fabricator');
      console.log('AutoBuild tech:', hasAutoBuildTech);
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

  const product = gameInfo.product;

  return (
    <div className="build-product-container">
      <div className="build-button-container">
        <GameWorkButton
          autoShip={isAutoBuildEnabled}
          onClick={handleBuildProduct}
          isWorkBeingDone={product.is_building}
          titleDefault="Start Build"
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
                  <button onClick={handleCheckInventory}>Check Inventory</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isInventoryModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeInventoryModal}>&times;</span>
            {inventoryProgress < 100 ? (
              <ProgressBar isActive={true} progress={inventoryProgress} labelText="Checking inventory..." />
            ) : (
              <p>📦 {gameInfo.inventory[0].on_hand} on hand</p>
            )}
          </div>
        </div>
      )}
      <ProgressBar
        isError={!!buildError}
        isActive={product.is_building}
        labelText={buildError || (product.isBuilding ? product.building_steps[Math.floor(product.progress / (100 / product.building_steps.length))].name : 'Waiting for a build order...')}
        progress={product.progress}
      />
      
    </div>
  );
};

export default BuildProductView;