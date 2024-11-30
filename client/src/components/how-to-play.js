import React from 'react';
import Drawer from './drawer';
import './how-to-play.css';

const HowToPlay = ({ isOpen, onClose }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <h2>How To Play</h2>
      <div className="how-to-play-content">
        <p>Welcome to Shipper Game! 🚢</p>
        <p>Your goal is to become the most efficient shipping company in the world. 🌍</p>
        <h3>Getting Started</h3>
        <p>1. Accept orders from various businesses.</p>
        <p>2. Ship the orders as quickly and efficiently as possible.</p>
        <p>3. Earn money and upgrade your technology to improve your shipping capabilities.</p>
        <h3>Tips & Tricks</h3>
        <p>💡 Focus on upgrading your technology early to gain an edge over competitors.</p>
        <p>💡 Keep an eye on your finances and make sure to balance income and expenses.</p>
        <p>💡 Use the AutoShip feature to automate repetitive tasks and save time.</p>
        <p>Good luck, and happy shipping! 🚀</p>
      </div>
    </Drawer>
  );
};

export default HowToPlay;