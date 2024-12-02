import React from 'react';
import './right-window.css';

const RightWindow = () => {
  return (
    <div className="right-window">
      <div className="game-task" data-points="10">
        Task 1: Create 50 products
        <div className="task-popup">To complete this task, you need to create 50 products in the game. Use the product creation tool to achieve this.</div>
      </div>
      <div className="game-task" data-points="20">
        Task 2: Ship 50 orders
        <div className="task-popup">To complete this task, you need to ship 50 orders. Use the shipping tool to fulfill the orders.</div>
      </div>
    </div>
  );
};

export default RightWindow;