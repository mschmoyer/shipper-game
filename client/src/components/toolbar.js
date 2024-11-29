import React, { useState } from 'react';
import { purchaseTechnology } from '../api'; // Import the API function
import './toolbar.css';

const Toolbar = ({ availableTechnologies }) => {
  const [selectedTech, setSelectedTech] = useState(null);
  const [newsMessage, setNewsMessage] = useState('');

  const handlePurchase = async () => {
    try {
      const result = await purchaseTechnology(selectedTech.id, selectedTech.cost);
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
    <div className="toolbar">
      {availableTechnologies.map(tech => (
        <div key={tech.id} className="tech-card" onClick={() => setSelectedTech(tech)}>
          <div className="tech-name">{tech.name}</div>
          <div className="tech-description">{tech.description}</div>
          <div className="tech-effect">{tech.gameEffect}</div>
          <div className="tech-cost">💰 {tech.cost}</div>
        </div>
      ))}
      {selectedTech && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Purchase</h2>
            <p>Do you want to purchase {selectedTech.name} for 💰 {selectedTech.cost}?</p>
            <button onClick={handlePurchase}>Confirm</button>
            <button onClick={() => setSelectedTech(null)}>Cancel</button>
          </div>
        </div>
      )}
      {newsMessage && (
        <div className="news-message">
          {newsMessage}
        </div>
      )}
    </div>
  );
};

export default Toolbar;
