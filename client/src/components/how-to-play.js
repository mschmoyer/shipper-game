import React from 'react';
import Drawer from './drawer';
import './how-to-play.css';

const HowToPlay = ({ isOpen, onClose, gameTitle }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="How To Play">
      <div className="how-to-play-content">
        <p>Welcome to {gameTitle}! 🚢</p>
        <h3>Getting Started</h3>
        <p>1. Ship the orders that come in as quickly and efficiently as possible.</p>
        <p>2. Upgrade your technology to keep up with the increasing demand.</p>
        <p>3. Watch your reputation and money to build an efficient operation.</p>
        <h3>Goals</h3>
        <p>Secure your legacy on the leaderboard by building the best business possible within the time limit.</p>
        <p>Earn the most money, ship the most orders, or be the most technologically advanced business to win!</p>
        <h3>Tips & Tricks</h3>
        <p>1. Focus on upgrading your technology early to gain an edge over competitors.</p>
        <p>2. Keep an eye on your finances and make sure to balance income and expenses.</p>
        <p>3. Use the AutoShip feature to automate repetitive tasks and save time.</p>
        <p className="good-luck">Good luck, and happy shipping! 🚀</p>
      </div>
    </Drawer>
  );
};

export default HowToPlay;