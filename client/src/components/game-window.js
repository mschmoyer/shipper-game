import React, { useState } from 'react';
import './game-window.css';

import TechnologyView from './technology-view';
import TechnologyTree from './technology-tree';

import ShipOrderView from './ship-order-view';
import BuildProductView from './build-product-view';
import SkillsView from './skills-view'; // Import the new SkillsView component

const GameWindow = ({ gameInfo }) => {
  const [isTechViewVisible, setIsTechViewVisible] = useState(false);
  const [isSkillsViewVisible, setIsSkillsViewVisible] = useState(false); // Add state for skills view

  const openTechView = () => {
    setIsTechViewVisible(true);
  };

  const openSkillsView = () => {
    setIsSkillsViewVisible(true); // Function to open skills view
  };

  return (
    <div className="game-window">
      <BuildProductView gameInfo={gameInfo} />
      <ShipOrderView gameInfo={gameInfo} />
      <div className="thing-button-container">
        <button className="tech-button" onClick={openTechView}>
          🛠️
          <div className="tech-label">Technology</div>
        </button>
        <button className="tech-button" onClick={openSkillsView}> {/* Update onClick to openSkillsView */}
          🎓
          <div className="tech-label">Skills</div>
          {gameInfo.player.available_points > 0 && (
            <div className="points-badge visible">{gameInfo.player.available_points}</div>
          )}
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
    </div>
  );
};

export default GameWindow;
