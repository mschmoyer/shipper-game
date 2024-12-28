import React, { useState, useEffect } from 'react';
import './game-window.css';
import TechnologyTree from './technology-tree';
import ShipOrderView from './ship-order-view';
import BuildProductView from './build-product-view';
import PrepareOrderView from './prepare-order-view';
import SkillsView from './skills-view';
import NetworkView from './network-view';

const GameWindow = ({ gameInfo }) => {
  const [isTechViewVisible, setIsTechViewVisible] = useState(false);
  const [isSkillsViewVisible, setIsSkillsViewVisible] = useState(false);
  const [isNetworkViewVisible, setIsNetworkViewVisible] = useState(false);
  const [affordableTechCount, setAffordableTechCount] = useState(0);

  const isMobileMode = window.innerWidth <= 600;

  useEffect(() => {
    const affordableCount = gameInfo.technology.filter(tech => tech.cost <= gameInfo.business.money && tech.acquired_id === null).length;
    setAffordableTechCount(affordableCount);
  }, [gameInfo]);

  const openTechView = () => {
    setIsTechViewVisible(true);
  };

  const openSkillsView = () => {
    setIsSkillsViewVisible(true);
  };

  const openNetworkView = () => {
    setIsNetworkViewVisible(true);
  };

  return (
    <div className="game-window">

      <BuildProductView gameInfo={gameInfo} product={gameInfo.allProducts[0]} />
      <BuildProductView gameInfo={gameInfo} product={gameInfo.allProducts[1]} />
      <BuildProductView gameInfo={gameInfo} product={gameInfo.allProducts[2]} />

      {/* TODO: Disabled for now. */}
      {false && 
        <PrepareOrderView gameInfo={gameInfo} /> 
      }
      <ShipOrderView gameInfo={gameInfo} />

      <div className="thing-button-container">
        <button className="tech-button" onClick={openTechView}>
          🛠️
          <div className="tech-label">{isMobileMode ? 'Tech' : 'Technology'}</div>
          {affordableTechCount > 0 && (
            <div className="points-badge visible">{affordableTechCount}</div>
          )}
        </button>
        <button className="tech-button" onClick={openSkillsView}>
          🎓
          <div className="tech-label">Skills</div>
          {gameInfo.business.available_points > 0 && (
            <div className="points-badge visible">{gameInfo.business.available_points}</div>
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
        business={gameInfo.business}
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
