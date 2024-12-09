import React, { useState, useEffect } from 'react';
import './game-window.css';

import TechnologyView from './technology-view';
import TechnologyTree from './technology-tree';

import ShipOrderView from './ship-order-view';
import BuildProductView from './build-product-view';
import SkillsView from './skills-view'; // Import the new SkillsView component
import NetworkView from './network-view'; // Import the new NetworkView component

const GameWindow = ({ gameInfo }) => {
  const [isTechViewVisible, setIsTechViewVisible] = useState(false);
  const [isSkillsViewVisible, setIsSkillsViewVisible] = useState(false); // Add state for skills view
  const [isNetworkViewVisible, setIsNetworkViewVisible] = useState(false); // Add state for network view
  const [affordableTechCount, setAffordableTechCount] = useState(0);

  const isMobileMode = window.innerWidth <= 600;

  useEffect(() => {
    const affordableCount = gameInfo.technology.filter(tech => tech.cost <= gameInfo.player.money && tech.acquired_id === null).length;
    setAffordableTechCount(affordableCount);
  }, [gameInfo]);

  const openTechView = () => {
    setIsTechViewVisible(true);
  };

  const openSkillsView = () => {
    setIsSkillsViewVisible(true); // Function to open skills view
  };

  const openNetworkView = () => {
    setIsNetworkViewVisible(true); // Function to open network view
  };

  return (
    <div className="game-window">

      <BuildProductView gameInfo={gameInfo} />

      {gameInfo.player.products_built > 0 && (
        <ShipOrderView gameInfo={gameInfo} />
      )}

      <div className="thing-button-container">
        <button className="tech-button" onClick={openTechView}>
          🛠️
          <div className="tech-label">{isMobileMode ? 'Tech' : 'Technology'}</div>
          {affordableTechCount > 0 && (
            <div className="points-badge visible">{affordableTechCount}</div>
          )}
        </button>
        <button className="tech-button" onClick={openSkillsView}> {/* Update onClick to openSkillsView */}
          🎓
          <div className="tech-label">Skills</div>
          {gameInfo.player.available_points > 0 && (
            <div className="points-badge visible">{gameInfo.player.available_points}</div>
          )}
        </button>
        <button className="tech-button" onClick={openNetworkView}>
          🌐
          <div className="tech-label">Network</div>
        </button>
      </div>
      <TechnologyTree
        gameInfo={gameInfo}
        isOpen={isTechViewVisible}
        onClose={() => setIsTechViewVisible(false)}
      />
      <SkillsView
        player={gameInfo.player} // Pass player data to SkillsView
        isOpen={isSkillsViewVisible}
        onClose={() => setIsSkillsViewVisible(false)}
      />
      <NetworkView
        isOpen={isNetworkViewVisible}
        onClose={() => setIsNetworkViewVisible(false)}
      />
    </div>
  );
};

export default GameWindow;
