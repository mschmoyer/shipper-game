import React, { useState, useEffect } from 'react';
import './network-view.css'; // Create a CSS file for styling if needed
import { fetchNetworkData } from '../api'; // Import the API call
import Drawer from './reusable/drawer'; // Import the Drawer component

const NetworkView = ({ isOpen, onClose }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkData().then(data => setPlayers(data));
    }
  }, [isOpen]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Network View">
      <table className="network-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Inventory</th>
            <th>Orders Shipped</th>
            <th>Technologies Purchased</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              <td>
                <div className="business-name">{player.business_name}</div>
                <div>Owner: {player.name}</div>
                <div>Selling: {player.product_emoji} {player.product_name}s</div>
                <div>Category: {player.product_category}</div>
              </td>
              <td>{player.inventory_on_hand}</td>
              <td>{player.orders_shipped}</td>
              <td>{player.technology_emojis ? player.technology_emojis : 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Drawer>
  );
};

export default NetworkView;