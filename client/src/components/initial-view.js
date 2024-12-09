import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';
import gameTitleImage from '../images/game-title.png'; // Adjust the path if you move the image

const InitialView = ({ onAccountCreated }) => {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false); // Add state for account creation
  const [productInfo, setProductInfo] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    createAccount({ name, businessName }) 
      .then(data => {
        setLoading(false);
        if (data.success) {
          setProductInfo({
            playerId: data.player_id,
            businessName: data.business_name || '',
            businessDescription: data.business_description || '',
            productName: data.product_name || '',
            productDescription: data.product_description || '',
            productCategory: data.product_category || 'General',
            emoji: data.product_emoji || '📦'
          });
          setAccountCreated(true); // Set account created to true
        } else {
          setErrorMessage(data.error);
        }
      })
      .catch(error => {
        console.error('Failed to create account:', error);
        setLoading(false);
        setErrorMessage('Failed to create account. Please try again.');
      });
  };

  const handleReady = () => {
    document.cookie = `playerId=${productInfo.playerId}; path=/`;
    onAccountCreated();
  };

  const handleStartOver = () => {
    setName('');
    setBusinessName('');
    setErrorMessage('');
    setLoading(false);
    setAccountCreated(false);
    setProductInfo({});
  };

  return (
    <div className="initial-view">
      <div className="login-box">
        {accountCreated ? (
          <div className="account-info">
            <p>Your new business name is:</p>
            <h3>{productInfo.businessName}</h3>
            <p className="descriptive-block">{productInfo.businessDescription}</p>
            <p className="account-info-you-sell-text">You sell:</p>
            <h3>{productInfo.emoji} {productInfo.productName}s</h3>
            <p>Category: {productInfo.productCategory}</p>
            <p className="descriptive-block">{productInfo.productDescription}</p>
            <div className="account-info-button-container">
              <button onClick={handleReady} className="ready-button">Ready!</button>
              <button onClick={handleStartOver} className="start-over-button">Start Over</button>
            </div>
          </div>
        ) : (
          <>
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
            {loading && <p className="loading-message">Your AI assistant is generating some products to sell... 🤖</p>}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default InitialView;
