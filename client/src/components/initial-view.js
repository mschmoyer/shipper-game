import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';

const InitialView = ({ onAccountCreated }) => {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Add state for error message
  const [loading, setLoading] = useState(false); // Add state for loading

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true
    createAccount({ name, businessName }) 
      .then(data => {
        setLoading(false); // Set loading to false
        if (data.success) {
          document.cookie = `playerId=${data.playerId}; path=/`;
          onAccountCreated();
        } else {
          setErrorMessage(data.error); // Set the error message
        }
      })
      .catch(error => {
        console.error('Failed to create account:', error);
        setLoading(false); // Set loading to false
        setErrorMessage('Failed to create account. Please try again.'); // Set a generic error message
      });
  };

  return (
    <div className="initial-view">
      <p className="game-description">
        Welcome to Click & Ship Tycoon! Manage your shipping business, upgrade your technology, and become the best in the industry.
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
        <button type="submit" className="create-account-button" style={{ backgroundColor: 'green' }} disabled={loading}>Found New Business</button>
      </form>
      {loading && <p className="loading-message">Your AI assistant is generating some products to sell... 🤖</p>} {/* Display the loading message */}
      {errorMessage && <p className="error-message">{errorMessage}</p>} {/* Display the error message */}
    </div>
  );
};

export default InitialView;
