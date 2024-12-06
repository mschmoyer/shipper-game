import React from 'react';
import Drawer from './reusable/drawer';
import './leaderboard.css';

const truncate = (str, maxLength) => str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;

const formatCurrency = (amount) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const Leaderboard = ({ isOpen, onClose, ordersShipped, moneyEarned, techLevel }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title='Leaderboard'>
      <div className="leaderboard-container">
        <div className="leaderboard-section">
          <h3>Most Orders Shipped</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {ordersShipped.map((player, index) => (
                <tr key={index}>
                  <td>{truncate(player.name, 18)}</td>
                  <td>{truncate(player.business_name, 18)}</td>
                  <td>{player.orders_shipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="leaderboard-section">
          <h3>Highest Revenue</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {moneyEarned.map((player, index) => (
                <tr key={index}>
                  <td>{truncate(player.name, 18)}</td>
                  <td>{truncate(player.business_name, 18)}</td>
                  <td>{formatCurrency(player.total_money_earned || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="leaderboard-section">
          <h3>Most Advanced Technology</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Tech</th>
              </tr>
            </thead>
            <tbody>
              {techLevel.map((player, index) => (
                <tr key={index}>
                  <td>{truncate(player.name, 18)}</td>
                  <td>{truncate(player.business_name, 18)}</td>
                  <td>{player.tech_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
};

export default Leaderboard;