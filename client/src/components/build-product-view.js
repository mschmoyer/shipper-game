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

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleBuildProduct = async () => {
    if (isRetrying || gameInfo.product.isBuilding) {
      return;
    }
    gameInfo.product.isBuilding = true;
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
          gameInfo.product.isBuilding = false;
          if (isAutoBuildEnabled) {
            setIsRetrying(true);
            console.log('isRetrying:', isRetrying);
            setTimeout(handleBuildProduct, 10000); // Add a one-second delay before retrying
          }
        }
      })
      .catch(error => console.error('Failed to start product build:', error));
  };

  // Check if the player has the AutoBuild technology
  useEffect(() => {
    if (gameInfo) {
      const hasAutoBuildTech = gameInfo.acquiredTechnologies && 
        gameInfo.acquiredTechnologies.some(tech => tech.techCode === 'hire_fabricator');
      console.log('AutoBuild tech:', hasAutoBuildTech);
      if (hasAutoBuildTech) {
        setIsAutoBuildEnabled(true);
      } else {
        setIsAutoBuildEnabled(false);
      }
    }
  }, [gameInfo]);

  useEffect(() => {
    if (isAutoBuildEnabled && !gameInfo.product.isBuilding && !isRetrying) {
      console.log('Starting new build automatically, autoBuildEnabled:', isAutoBuildEnabled);
      handleBuildProduct();
    }
  }, [isAutoBuildEnabled, gameInfo.product.isBuilding, isRetrying]);

  useEffect(() => {
    if (!gameInfo.product.isBuilding && isAutoBuildEnabled && !isRetrying) {
      setTimeout(handleBuildProduct, 10); // Add a one-second delay before retrying
    }
  }, [gameInfo.product.isBuilding, gameInfo.product.progress, isAutoBuildEnabled, isRetrying]);

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
          isWorkBeingDone={product.isBuilding}
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
                <p>💵 Cost: ${product.costToBuild}</p>
                <p>💲 Price: ${product.salesPrice}</p>
              </div>
            </div>
          )}
          <div className="cost-info">
            <div className="shipping-info">
              <p>🔢 Quantity: {gameInfo.player.productsPerBuild}</p>
            </div>
            <div className="profit-info">
              <p>💰 Build Cost: ${product.costToBuild}</p>
            </div>
            {gameInfo.inventory[0] && (
              <div className="inventory-info">
                <p>📦 {gameInfo.inventory[0].onHand} on hand</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ProgressBar
        isError={!!buildError}
        isActive={product.isBuilding}
        labelText={buildError || (product.isBuilding ? product.buildingSteps[Math.floor(product.progress / (100 / product.buildingSteps.length))].name : 'Waiting for a build order...')}
        progress={product.progress}
      />
      
    </div>
  );
};

export default BuildProductView;