import React, { useState } from 'react';
import Drawer from './reusable/drawer';
import { purchaseTechnology } from '../api';
import './technology-tree.css';

const TechnologyTree = ({ gameInfo, isOpen, onClose }) => {
  const [selectedTech, setSelectedTech] = useState(null);
  const [newsMessage, setNewsMessage] = useState('');
  const technologies = gameInfo?.technology || [];
  const playerFunds = gameInfo?.player.money || 0;

  let availableTechnologies = technologies.filter(tech => tech.acquired_id === null);

  // sort availableTechnologies by tech_level_required, then cost
  availableTechnologies = availableTechnologies.sort((a, b) => {
    if (a.tech_level_required === b.tech_level_required) {
      return a.cost - b.cost;
    }
    return a.tech_level_required - b.tech_level_required;
  });

  const activeTechnologies = technologies.filter(tech => tech.acquired_id !== null);


  const formatCost = (cost) => {
    return cost.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePurchase = async (tech) => {
    try {
      const result = await purchaseTechnology(tech.id);
      setNewsMessage(result.message);
    } catch (error) {
      if (error.message === 'Insufficient funds') {
        setNewsMessage('Purchase failed: Insufficient funds');
      } else {
        setNewsMessage(error.message);
      }
    } finally {
      setSelectedTech(null);
      setTimeout(() => setNewsMessage(''), 7000);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Technology" className="technology-tree-drawer">
      <h2>Available Technologies</h2>
      <div className="technology-tree-container">        
        {availableTechnologies.map(tech => {
          const isUnaffordable = tech.cost > playerFunds;
          return (
            <div key={tech.id} className={`tech-tree-card ${isUnaffordable ? 'unaffordable' : ''}`}>
              <div className="tech-tree-card-header">
                <span className="tech-tree-emoji">{tech.emoji}</span>
                <span className={`tech-tree-cost ${isUnaffordable ? 'unaffordable-cost' : ''}`}>${formatCost(tech.cost)}</span>
              </div>
              <div className="tech-tree-title">
                <a href={tech.shipstation_kb_link} target="_blank" rel="noopener noreferrer">{tech.name}</a>
              </div>            
              <div className="tech-tree-effect">{tech.game_effect}</div>
              <div className="tech-tree-description">{tech.description}</div>
              <button 
                className="tech-tree-purchase-button" 
                onClick={() => setSelectedTech(tech)} 
                disabled={isUnaffordable}
              >
                Purchase
              </button>
            </div>
          );
        })}
      </div>
      <h2>Active Technologies</h2>
      <div className="technology-tree-container">        
        {activeTechnologies.map(tech => (
          <div key={tech.id} className="tech-tree-card">
            <div className="tech-tree-card-header">
              <span className="tech-tree-emoji">{tech.emoji}</span>
              <span className="tech-tree-cost">${formatCost(tech.cost)}</span>
            </div>
            <div className="tech-tree-title">
              <a href={tech.shipstation_kb_link} target="_blank" rel="noopener noreferrer">{tech.name}</a>
            </div>
            <div className="tech-tree-description">{tech.description}</div>
            <div className="tech-tree-effect">{tech.game_effect}</div>
          </div>
        ))}
      </div>
      {selectedTech && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Purchase</h2>
            <p>Do you want to purchase {selectedTech.name} for 💰 {selectedTech.cost}?</p>
            <button onClick={() => handlePurchase(selectedTech)}>Confirm</button>
            <button onClick={() => setSelectedTech(null)}>Cancel</button>
          </div>
        </div>
      )}
      {newsMessage && (
        <div className="news-message">
          {newsMessage}
        </div>
      )}
    </Drawer>
  );
};

export default TechnologyTree;