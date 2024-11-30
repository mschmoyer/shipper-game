import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';

const InitialView = ({ onAccountCreated }) => {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    createAccount({ name, businessName, email, apiKey, apiSecret })
      .then(data => {
        if (data.success) {
          document.cookie = `playerId=${data.playerId}; path=/`;
          onAccountCreated();
        } else {
          alert('Failed to create account');
        }
      })
      .catch(error => console.error('Failed to create account:', error));
  };

  return (
    <div className="initial-view">
      <h1 className="game-title">Shipper Game</h1>
      <p className="game-description">
        Welcome to Shipper Game! Manage your shipping business, upgrade your technology, and become the best in the industry.
      </p>
      <form className="account-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Give yourself a name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Your new enterprise is called (business name):</label>
          <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <button type="submit" className="create-account-button">Create Account</button>
      </form>
    </div>
  );
};

export default InitialView;
