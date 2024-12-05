import React, { useState, useEffect } from 'react';
import { completeFindTheProductHaystackGame } from '../../api'; // Import the API function
import './find-the-product-haystack.css';

const FindTheProductHaystackGame = ({ onClose }) => {
  const [correctIndex] = useState(Math.floor(Math.random() * 25));
  const [clickedIndexes, setClickedIndexes] = useState([]);
  const [foundProduct, setFoundProduct] = useState(false);
  const [remainingSearches, setRemainingSearches] = useState(15);
  let gameCompleted = false;

  const handleClick = (index) => {
    if (!gameCompleted) {
      if (index === correctIndex) {
        setFoundProduct(true);
        completeFindTheProductHaystackGame(true); // Call API with success
        gameCompleted = true;
        setTimeout(onClose, 2000);
      } else {
        setClickedIndexes([...clickedIndexes, index]);
        setRemainingSearches((prev) => prev - 1);
      }
    }
  };

  useEffect(() => {
    if (remainingSearches <= 0 && !foundProduct) {
      if (!gameCompleted) {
        completeFindTheProductHaystackGame(false); // Call API with failure
        gameCompleted = true;
        setTimeout(onClose, 2000);
      }
    }
  }, [remainingSearches, foundProduct, onClose]);

  return (
    <div className="modal">
      <div className="modal-content">
        <p className="intro-text">Someone lost the product that goes in this order. Quickly find it so you can resume shipping!</p>
        {foundProduct ? (
          <div className="found-product-message">You found the missing product!</div>
        ) : remainingSearches <= 0 ? (
          <div className="found-product-message">
            You failed to find the product! It will cost you $1000 to make the customer whole.
          </div>
        ) : (
          <div>
            <div className="package-grid">
              {Array.from({ length: 25 }).map((_, index) => (
                <span
                  key={index}
                  className={`package-emoji ${clickedIndexes.includes(index) ? 'wrong' : ''}`}
                  onClick={() => handleClick(index)}
                >
                  📦
                </span>
              ))}
            </div>
            <p className="remaining-searches">Remaining searches: {remainingSearches}</p>
          </div>
        )}
        <p className="tech-prompt">
          Buy the <b>Scan To Verify</b> tech to prevent this ugly situation from impacting your order fulfillment!
          <br />
          <strong>Note:</strong> Failing this game could cause a customer to demand money back. 
        </p>
      </div>
    </div>
  );
};

export default FindTheProductHaystackGame;