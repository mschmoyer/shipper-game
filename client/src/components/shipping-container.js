import React, { useState, useEffect } from 'react';
import './shipping-container.css';
import { completeShipping, startShipping } from '../api';

const ShippingContainer = ({ gameInfo, autoShipEnabled }) => {
  const [shippingState, setShippingState] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [buildCost, setBuildCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [distance, setDistance] = useState(0); // Add state for distance

  const successMessages = [
    'Order Shipped! 🎉',
    'Shipment Successful! 🚚',
    'Package Delivered! 📦',
    'Customer Happy! 😊',
    'Order Complete! ✅',
    'Shipment Done! 📬',
    'Delivery Success! 🛒',
    'Package Sent! 📮',
    'Order Fulfilled! 🏷️',
    'Shipment Finished! 🏁'
  ];

  useEffect(() => {
    if (autoShipEnabled && !gameInfo.isShipping) {
      console.log('Starting new order automatically on mount');
      handleShipOrder();
    }
  }, [autoShipEnabled]); // Add autoShipEnabled as a dependency to ensure it runs on mount when autoShipEnabled is true

  useEffect(() => {
    if (!gameInfo.isShipping) {
      if (autoShipEnabled) {
        setTimeout(handleShipOrder, 10); // Automatically start a new order after 0.5 seconds
      }
    }
  }, [gameInfo.isShipping, gameInfo.progress, autoShipEnabled]);

  const handleShipOrder = () => {
    console.log('Ship Order button clicked');
    setShippingState('Fetching order to ship...');
    gameInfo.isShipping = true; // Disable the button instantly
    gameInfo.progress = 10; // Reset progress to 0 immediately
    setShippingState(''); // Trigger a render
    setTimeout(() => {
      setShippingState(''); // Trigger another render to ensure progress bar resets without animation
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              console.log('Shipping started successfully');
              setShippingCost(data.shippingCost);
              setBuildCost(gameInfo.product.costToBuild);
              setTotalCost(data.shippingCost + gameInfo.product.costToBuild);
              setDistance(data.distance); // Set the distance
            } else {
              console.error('Failed to start shipping');
            }
          })
          .catch(error => console.error('Failed to start shipping:', error));
      }, 0);
    }, 0);
  };

  return (
    <div className="shipping-container">
      <div className="ship-button-container">
        <button
          className={`ship-button ${autoShipEnabled ? 'auto-ship' : ''}`}
          onClick={handleShipOrder}
          disabled={gameInfo.isShipping}
        >
          {autoShipEnabled ? 'Working...' : gameInfo.isShipping ? 'Working...' : 'Ship Order'}
        </button>
        <div className="product-info">
          <h3> {gameInfo.product.name}</h3>
          <p>Description: {gameInfo.product.description}</p>
          <p>Weight: {gameInfo.product.weight} kg</p>
          <p>Cost: ${gameInfo.product.costToBuild}</p>
          <p>Price: ${gameInfo.product.salesPrice}</p>
        </div>
      </div>
      <div className="progress-bar-container">
        <div className={`progress-bar ${gameInfo.isShipping ? 'smooth' : ''}`} style={{ width: `${gameInfo.isShipping ? gameInfo.progress : 0}%` }}></div>
        <div className="shipping-state">
          {gameInfo.isShipping ? gameInfo.shippingSteps[Math.floor(gameInfo.progress / (100 / gameInfo.shippingSteps.length))].name : shippingState}
        </div>
      </div>
      <div className="cost-info">
        <p>🔨 Build Cost: ${buildCost}</p>
        <p>🚚 Shipping Cost: ${shippingCost}</p>
        <p>💰 Total Cost: ${totalCost}</p>
        <p>📏 Distance: {distance} miles</p> {/* Add distance display */}
      </div>
      
      
    </div>
  );
};

export default ShippingContainer;
