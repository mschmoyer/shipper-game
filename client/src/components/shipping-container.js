import React, { useState, useEffect } from 'react';
import './shipping-container.css';
import { completeShipping, startShipping } from '../api';

const ShippingContainer = ({ gameInfo }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [shippingState, setShippingState] = useState('');

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
    if (!gameInfo.isShipping && gameInfo.progress === 100) {
      completeShipping()
        .then(data => {
          console.log(data.message);
          const randomMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
          setMessage(randomMessage);
          setShippingState(randomMessage);
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 3000);
        })
        .catch(error => console.error('Failed to complete shipping:', error));
    }
  }, [gameInfo.isShipping, gameInfo.progress]);

  const handleShipOrder = () => {
    console.log('Ship Order button clicked');
    setShippingState('Fetching order to ship...');
    gameInfo.progress = 0; // Reset progress to 0 immediately
    setShippingState(''); // Trigger a render
    gameInfo.isShipping = true; // Update isShipping to true after a short delay
    setShippingState(''); // Trigger a render
    setTimeout(() => {
      startShipping()
        .then(data => {
          if (data.message === 'Shipping started successfully.') {
            console.log('Shipping started successfully');
          } else {
            console.error('Failed to start shipping');
          }
        })
        .catch(error => console.error('Failed to start shipping:', error));
    }, 0);
  };

  return (
    <div className="shipping-container">
      <div className="ship-button-container">
        <button className="ship-button" onClick={handleShipOrder} disabled={gameInfo.isShipping}>
        {gameInfo.isShipping ? 'Working...' : 'Ship Order'}
        </button>
      </div>
      <div className="progress-bar-container">
        <div className={`progress-bar ${gameInfo.isShipping ? 'smooth' : ''}`} style={{ width: `${gameInfo.progress}%` }}></div>
      </div>
      <div className="shipping-state">
        {gameInfo.isShipping ? gameInfo.shippingStates[Math.floor(gameInfo.progress / (100 / gameInfo.shippingStates.length))] : shippingState}
      </div>
      {showMessage && <div className="order-shipped-message">{message}</div>}
    </div>
  );
};

export default ShippingContainer;
