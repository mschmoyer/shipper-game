import React, { useState, useEffect } from 'react';
import './network-view.css'; // Create a CSS file for styling if needed
import { fetchNetworkData } from '../api'; // Import the API call
import Drawer from './reusable/drawer'; // Import the Drawer component

const NetworkView = ({ isOpen, onClose }) => {
  const [businesss, setBusinesss] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkData().then(data => setBusinesss(data));
    }
  }, [isOpen]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Network View">
      <table className="network-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Inventory</th>
            <th>Shipped</th>
            <th>Tech</th>
          </tr>
        </thead>
        <tbody>
          {businesss.map(business => (
            <tr key={business.id}>
              <td>
                <div className="business-name">{business.business_name}</div>
                <div>Owner: {business.name}</div>
                <div>{business.product_emoji} {business.product_name}s</div>
                <div><i>{business.product_category}</i></div>
              </td>
              <td>{business.inventory_on_hand}</td>
              <td>{business.orders_shipped}</td>
              <td>{business.technology_emojis ? business.technology_emojis : 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Drawer>
  );
};

export default NetworkView;