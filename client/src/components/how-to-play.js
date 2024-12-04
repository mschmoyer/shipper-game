import React from 'react';
import Drawer from './reusable/drawer';
import './how-to-play.css';

const HowToPlay = ({ isOpen, onClose, gameTitle }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="How To Play">
      <div className="how-to-play-content">
        <p>Welcome to {gameTitle}! 🚢</p>
        <h3>Game Loop</h3>
        <p>1. Build products.</p>
        <p>2. Ship orders as quickly and efficiently as possible.</p>
        <p>3. Innovate products to get more business.</p>
        <p>4. Upgrade your technology and skills to improve your operational efficiency.</p>
        <h3>Goals</h3>
        <p>Secure your legacy on the leaderboard by building the best business possible within the time limit.</p>
        <p>Earn the most money, ship the most orders, or be the most technologically advanced business to win!</p>
        <h3>Technology</h3>
        <p>1. Acquire new technologies to unlock special abilities and bonuses.</p>
        <p>2. Technologies can improve various aspects of your business, such as shipping speed, inventory management, and cost reduction.</p>
        <h3>Skills</h3>
        <p>1. Earn skill points by completing orders and building products.</p>
        <p>2. Use skill points to upgrade your shipping speed, building speed, and order spawn rate.</p>
        <h3>Tips & Tricks</h3>
        <p>1. Focus on upgrading your technology early to gain an edge over competitors.</p>
        <p>2. Keep an eye on your finances and make sure to balance income and expenses.</p>
        <p>3. Use the AutoShip feature to automate repetitive tasks and save time.</p>
        <p>4. Manage your inventory carefully to avoid running out of stock.</p>
        <p className="good-luck">Good luck, and happy shipping! 🚀</p>
      </div>
    </Drawer>
  );
};

export default HowToPlay;