import React, { useState, useEffect } from 'react';
import './shipping-container.css';
import { completeShipping, startShipping } from '../api';
import TechnologyView from './technology-view';

const ShippingContainer = ({ gameInfo, autoShipEnabled }) => {
  const [shippingState, setShippingState] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [buildCost, setBuildCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boxPosition, setBoxPosition] = useState(0);
  const [isTechViewVisible, setIsTechViewVisible] = useState(false);

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
  }, [autoShipEnabled]);

  useEffect(() => {
    if (!gameInfo.isShipping) {
      if (autoShipEnabled) {
        setTimeout(handleShipOrder, 0);
      }
    }
  }, [gameInfo.isShipping, gameInfo.progress, autoShipEnabled]);

  useEffect(() => {
    if (gameInfo.isShipping) {
      const interval = setInterval(() => {
        setBoxPosition(gameInfo.progress);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameInfo.isShipping, gameInfo.progress]);

  const handleShipOrder = () => {
    if (gameInfo.orders.length === 0 || !gameInfo.orders.some(order => order.state === 'AwaitingShipment')) {
      setShippingState('No orders to ship!');
      return;
    }
    setShippingState('Fetching order to ship...');
    gameInfo.isShipping = true;
    gameInfo.progress = 0;
    setShippingState('');
    setTimeout(() => {
      setShippingState(''); 
      setTimeout(() => {
        startShipping()
          .then(data => {
            if (data.message === 'Shipping started successfully.') {
              setShippingCost(data.shippingCost);
              setBuildCost(gameInfo.product.costToBuild);
              setTotalCost(data.shippingCost + gameInfo.product.costToBuild);
              setDistance(data.distance);
            } else {
              console.error('Failed to start shipping');
            }
          })
          .catch(error => console.error('Failed to start shipping:', error));
      }, 0);
    }, 0);
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleTechView = () => {
    setIsTechViewVisible(!isTechViewVisible);
  };

  const firstItem = gameInfo.inventory[0];

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
          <h3 onClick={toggleModal}>{gameInfo.product.name}</h3>
          {isModalOpen && (
            <div className="modal">
              <div className="modal-content">
                <span className="close" onClick={toggleModal}>&times;</span>
                <p>📝 Description: {gameInfo.product.description}</p>
                <p>⚖️ Weight: {gameInfo.product.weight} kg</p>
                <p>💵 Cost: ${gameInfo.product.costToBuild}</p>
                <p>💲 Price: ${gameInfo.product.salesPrice}</p>
              </div>
            </div>
          )}
          <div className="cost-info">
            <div className="shipping-info">
              <p>📦 Quantity: 1</p>
              <p>📏 Distance: {gameInfo.orders.length > 0 ? gameInfo.orders[0].distance : '--'} miles</p>
              <p>🚚 Shipping: ${shippingCost}</p>
            </div>
            <div className="profit-info">
              <p>📦 Build Cost: ${totalCost}</p>
              <p>💰 Sale Price: ${gameInfo.product.salesPrice}</p>
              <p>💵 Est. profit: ${gameInfo.product.salesPrice - totalCost}</p>
            </div>
            {firstItem && (
              <div className="inventory-info">
                <p>📦 {firstItem.onHand} on hand</p>
                <p>💔 {firstItem.damaged} damaged</p>
                <p>🚚 {firstItem.inTransit} in transit</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="progress-bar-container">
        <div className={`progress-bar ${gameInfo.isShipping ? 'smooth' : ''}`} style={{ width: `${gameInfo.isShipping ? gameInfo.progress : 0}%` }}></div>
        <div className="shipping-state">
          {gameInfo.isShipping ? gameInfo.shippingSteps[Math.floor(gameInfo.progress / (100 / gameInfo.shippingSteps.length))].name : shippingState}
        </div>
      </div>
      <button className="tech-button" onClick={toggleTechView}>
        🛠️
        <div className="tech-label">Technology</div>
      </button>
      {isTechViewVisible && (
        <div className="technology-view-container">
          <TechnologyView availableTechnologies={gameInfo.availableTechnologies} playerTechLevel={gameInfo.techLevel} />
        </div>
      )}
    </div>
  );
};

export default ShippingContainer;
