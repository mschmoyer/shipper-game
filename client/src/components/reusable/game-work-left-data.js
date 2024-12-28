import React from 'react';
import './game-work-left-data.css';

const GameWorkLeftData = ({ emoji, quantity }) => {
  return (
    <div className="game-work-left-data">
        <div className="data-item">
            <span className="quantity">{quantity}</span>
        </div>
    </div>
  );
};

export default GameWorkLeftData;
