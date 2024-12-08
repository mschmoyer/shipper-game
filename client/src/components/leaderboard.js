import React, { useEffect, useState } from 'react';
import Drawer from './reusable/drawer';
import { fetchLeaderboard } from '../api';
import './leaderboard.css';

const formatCurrency = (amount) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const Leaderboard = ({ isOpen, onClose }) => {
  const [leaderboardData, setLeaderboardData] = useState({ ordersShipped: [], moneyEarned: [], techLevel: [], topProductCategories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchLeaderboard()
        .then(data => {
          setLeaderboardData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch leaderboard:', error);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (loading) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} title='Leaderboard'>
        <div className="leaderboard-container">
          <p>Loading...</p>
        </div>
      </Drawer>
    );
  }

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
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.ordersShipped.map((player, index) => (
                <tr key={index}>
                  <td>{player.name}</td>
                  <td>{player.business_name}</td>
                  <td>{player.orders_shipped}</td>
                  <td>{player.emoji} {player.product_name}</td>
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
              {leaderboardData.moneyEarned.map((player, index) => (
                <tr key={index}>
                  <td>{player.name}</td>
                  <td>{player.business_name}</td>
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
              {leaderboardData.techLevel.map((player, index) => (
                <tr key={index}>
                  <td>{player.name}</td>
                  <td>{player.business_name}</td>
                  <td>{player.tech_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="leaderboard-section">
          <h3>Top Product Categories</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.topProductCategories.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.count}</td>
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