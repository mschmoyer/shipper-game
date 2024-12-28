import React, { useState } from 'react';
import './initial-view.css';
import { createAccount } from '../api';
import gameTitleImage from '../images/game-title.png';

const InitialView = ({ onAccountCreated }) => {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [productInfo, setProductInfo] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    createAccount({ name, businessName }) 
      .then(data => {
        setLoading(false);
        if (data.success) {
          setProductInfo(data.products.map(product => ({
            businessId: data.business_id,
            businessName: data.business_name || '',
            businessDescription: data.business_description || '',
            productName: product.name || '',
            productDescription: product.description || '',
            productCategory: product.category || 'General',
            emoji: product.emoji || '📦'
          })));
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
    document.cookie = `businessId=${productInfo[0].businessId}; path=/`;
    onAccountCreated();
  };

  const handleStartOver = () => {
    setName('');
    setBusinessName('');
    setErrorMessage('');
    setLoading(false);
    setAccountCreated(false);
    setProductInfo([]);
  };

  return (
    <div className="initial-view">
      <div className="login-box">
        {accountCreated ? (
          <div className="account-info">
            <p>Your new business name is:</p>
            <h3>{productInfo[0].businessName}</h3>
            <p className="descriptive-block">{productInfo[0].businessDescription}</p>
            <p className="account-info-you-sell-text">You sell:</p>
            {productInfo.map((product, index) => (
              <div className="product-definition" key={index}>
                <div className="large-emoji-icon">{product.emoji}</div> {/* Large centered emoji icon */}
                <div className="product-details">
                  <h3>{product.productName}</h3>
                  <p>Category: {product.productCategory}</p>
                  <p className="descriptive-block">{product.productDescription}</p>
                </div>
              </div>
            ))}
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
                <label>Type a few words to describe your business:</label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)} 
                  placeholder="" />
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
