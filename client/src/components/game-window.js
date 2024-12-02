import React, { useState } from 'react';
import './game-window.css';
import TechnologyView from './technology-view';
import ShipOrderView from './ship-order-view';
import BuildProductView from './build-product-view';

const GameWindow = ({ gameInfo, autoShipEnabled, autoBuildEnabled }) => {
  const [isTechViewVisible, setIsTechViewVisible] = useState(false);

  const openTechView = () => {
    setIsTechViewVisible(true);
  };

  return (
    <div className="game-window">
      <BuildProductView gameInfo={gameInfo} autoBuildEnabled={autoBuildEnabled} />
      <ShipOrderView
        gameInfo={gameInfo}
        autoShipEnabled={autoShipEnabled}
      />
      <button className="tech-button" onClick={openTechView}>
        🛠️
        <div className="tech-label">Show Technology Upgrades</div>
      </button>
      <TechnologyView
        availableTechnologies={gameInfo.availableTechnologies}
        playerTechLevel={gameInfo.techLevel}
        isOpen={isTechViewVisible}
        onClose={() => setIsTechViewVisible(false)}
      />
    </div>
  );
};

export default GameWindow;
