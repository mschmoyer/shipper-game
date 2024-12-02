import React, { useEffect, useState } from 'react';
import './build-product-view.css';
import { startProductBuild } from '../api';
import ProgressBar from './progress-bar';
import GameWorkButton from './game-work-button';

const BuildProductView = ({ gameInfo, autoBuildEnabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buildError, setBuildError] = useState('');

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleBuildProduct = async () => {
    try {
      const result = await startProductBuild();
      if (result.error) {
        console.error(result.error);
        setBuildError(result.error); // Set the error message
      } else {
        console.log(result.message);
        setBuildError(''); // Clear any previous error message
      }
    } catch (err) {
      console.error('Error building product:', err);
      setBuildError('Error building product'); // Set a generic error message
    }
  };

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
          autoShip={autoBuildEnabled}
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
                <p>���� Price: ${product.salesPrice}</p>
              </div>
            </div>
          )}
          <div className="cost-info">
            <div className="shipping-info">
              <p>🔢 Quantity: {product.quantityToBuild}</p>
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