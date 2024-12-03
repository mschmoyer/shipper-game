import React, { useState } from 'react';
import { purchaseTechnology } from '../api';
import Drawer from './drawer';
import './technology-view.css';

const TechnologyView = ({ availableTechnologies, playerTechLevel, isOpen, onClose }) => {
  const [selectedTech, setSelectedTech] = useState(null);
  const [newsMessage, setNewsMessage] = useState('');

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
    <Drawer isOpen={isOpen} onClose={onClose} title="Available Technologies" className="technology-drawer-container">
      <div className="tech-level">Tech Level: {playerTechLevel}</div>
      <div className="tech-cards-container">
        {availableTechnologies.map(tech => (
          <div key={tech.id} className="tech-card">
            <div className="tech-name-section">
              <div className="tech-name">{tech.name}</div>
            </div>
            <div className="tech-description">{tech.description}</div>
            <div className="tech-effect">{tech.gameEffect}</div>
            <a href={tech.shipstation_kb_link} target="_blank" rel="noopener noreferrer" className="tech-kb-link">Learn about this feature!</a>
            <button className="buy-button" onClick={() => setSelectedTech(tech)}>Buy - 💰 {tech.cost}</button>
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

export default TechnologyView;
