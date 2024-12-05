import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';

const InitialView = ({ onAccountCreated }) => {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Add state for error message

  const handleSubmit = (e) => {
    e.preventDefault();
    createAccount({ name, businessName }) 
      .then(data => {
        if (data.success) {
          document.cookie = `playerId=${data.playerId}; path=/`;
          onAccountCreated();
        } else {
          setErrorMessage(data.error); // Set the error message
        }
      })
      .catch(error => {
        console.error('Failed to create account:', error);
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
        <button type="submit" className="create-account-button" style={{ backgroundColor: 'green' }}>Create Account</button>
      </form>
      {errorMessage && <p className="error-message">{errorMessage}</p>} {/* Display the error message */}
    </div>
  );
};

export default InitialView;
