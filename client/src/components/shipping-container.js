import React, { useState } from 'react';
import './shipping-container.css';
import TechnologyView from './technology-view';
import ShipOrderView from './ship-order-view'; // Import new component

const ShippingContainer = ({ gameInfo, autoShipEnabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleTechView = () => {
    setIsTechViewVisible(!isTechViewVisible);
  };

  return (
    <div className="shipping-container">
      <ShipOrderView
        gameInfo={gameInfo}
        autoShipEnabled={autoShipEnabled}
        isModalOpen={isModalOpen}
        toggleModal={toggleModal}
      />
      <button className="tech-button" onClick={toggleTechView}>
        🛠️
        <div className="tech-label">
          {isTechViewVisible ? 'Hide Technology Upgrades' : 'Show Technology Upgrades'}
        </div>
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
