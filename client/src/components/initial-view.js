import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';
import gameTitleImage from '../images/game-title.png'; // Adjust the path if you move the image

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
      <div className="login-box">
        <img src={gameTitleImage} alt="Game Title" className="initial-view-title-image" />
        <p className="game-description">
          Welcome to Click & Ship Tycoon! 
          Manage your shipping business, upgrade your technology, 
          and become the best in the industry.
        </p>
        <form className="account-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Business Owner:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required />
          </div>
          <div className="form-group">
            <label>Choose a word that describes your business:</label>
            <input 
              type="text" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)} 
              placeholder="(Leave blank to let AI assistant generate it)" />
          </div>
          <button type="submit" className="create-account-button" style={{ backgroundColor: 'green' }} disabled={loading}>Start New Business</button>
        </form>
        {loading && <p className="loading-message">Your AI assistant is generating some products to sell... 🤖</p>} {/* Display the loading message */}
        {errorMessage && <p className="error-message">{errorMessage}</p>} 
      </div>
    </div>
  );
};

export default InitialView;
