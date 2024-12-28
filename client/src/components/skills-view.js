import React from 'react';
import './skills-view.css';
import { upgradeSkill } from '../api';
import Drawer from './reusable/drawer';

const SkillsView = ({ business, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleUpgrade = (skill) => {
    upgradeSkill(skill).then(() => {
      // Handle successful upgrade (e.g., refresh business data)
    });
  };

  const formatSpeed = (speed) => (speed / 1000).toFixed(2);
  const disableUpgrade = business.available_points <= 0;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="business Skills" className="skill-drawer-container">
      <div className="available-points">
        ⭐ Available Points: <span className="points-bubble">{business.available_points}</span>
      </div>
      <table>
        <tbody>
        <tr>
            <td>⚒️ Manufacturing</td>
            <td>{business.building_points}</td>
            <td>
              <button 
                className="square-button" 
                onClick={() => handleUpgrade('building_points')} 
                disabled={disableUpgrade}
              >+</button>
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="skill-description">Build products faster.</td>
          </tr>
          <tr>
            <td>📦 Logistics</td>
            <td>{business.shipping_points}</td>
            <td>
              <button 
                className="square-button" 
                onClick={() => handleUpgrade('shipping_points')} 
                disabled={disableUpgrade}
              >+</button>
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="skill-description">Ship orders faster.</td>
          </tr>
          <tr>
            <td>💡 Product Innovation</td>
            <td>{business.order_spawn_points}</td>
            <td>
              <button 
                className="square-button" 
                onClick={() => handleUpgrade('order_spawn_points')} 
                disabled={disableUpgrade}
              >+</button>
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="skill-description">More demand for products.</td>
          </tr>
        </tbody>
      </table>
      
      <h3 className="centered">Statistics</h3>
      <table>
        <tbody>
          <tr><td>Building Speed</td><td>{formatSpeed(business.building_duration)}s</td></tr>
          <tr><td>Building Steps</td><td>{business.building_steps.length}</td></tr>
          <tr><td>Products per Build</td><td>{business.products_per_build}</td></tr>
          <tr><td colspan="2">--</td></tr>
          <tr><td>Shipping Speed</td><td>{formatSpeed(business.shipping_duration)}s</td></tr>
          <tr><td>Shipping Steps</td><td>{business.shipping_steps.length}</td></tr>
          <tr><td>Order Batch Size</td><td>{business.orders_per_ship}</td></tr>
          <tr><td colspan="2">--</td></tr>
          <tr><td>Avg. Order Arrival</td><td>{formatSpeed(business.order_spawn_milliseconds)}s</td></tr>
          <tr><td>Order Spawn Count</td><td>{business.order_spawn_count}</td></tr>
          <tr><td colspan="2">--</td></tr>
          <tr><td>XP to next:</td><td>{business.xp}</td></tr>
        </tbody>
      </table>
    </Drawer>
  );
};

export default SkillsView;