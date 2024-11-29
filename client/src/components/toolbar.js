import React from 'react';
import './toolbar.css';

const Toolbar = ({ availableTechnologies }) => {
  return (
    <div className="toolbar">
      {availableTechnologies.map(tech => (
        <div key={tech.id} className="tech-card">
          <div className="tech-name">{tech.name}</div>
          <div className="tech-description">{tech.description}</div>
          <div className="tech-cost">💰 {tech.cost}</div>
        </div>
      ))}
    </div>
  );
};

export default Toolbar;
