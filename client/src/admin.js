
import React, { useState, useEffect } from 'react';
import { fetchAdminStats } from './api';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchAdminStats()
      .then(data => setStats(data))
      .catch(error => console.error('Failed to fetch admin stats:', error));
  }, []);

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Active Players: {stats.activePlayers}</p>
      <p>Total Orders: {stats.totalOrders}</p>
      <p>Total Products Built: {stats.totalProductsBuilt}</p>
      {/* Add more stats as needed */}
    </div>
  );
};

export default AdminPanel;