import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [progress, setProgress] = useState(0);
  const [shippingStateIndex, setShippingStateIndex] = useState(0);
  const [isShipping, setIsShipping] = useState(false);

  const shippingStates = [
    'Employee is searching for packing tape...',
    'Employee is scratching their head...',
    'Employee is slowly folding the box...',
    'Employee is looking for the right label...',
    'Employee is taking a coffee break...',
    'Employee is carefully placing the item in the box...',
  ];

  useEffect(() => {
    fetch('http://localhost:5005/api/shipping')
      .then(response => response.json())
      .then(data => {
        setProgress(data.progress);
        setIsShipping(data.isShipping === 1);
      })
      .catch(error => console.error('Failed to load shipping data:', error));
    let shippingInterval;
    let stateInterval;

    if (isShipping) {
      // Progress bar increment logic
      shippingInterval = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(shippingInterval);
            setIsShipping(false);
            return 100;
          }
          return prevProgress + 1.67; // Increment to reach 100 in ~1 minute
        });
      }, 1000);
    } else {
      setProgress(0);
    }

    // State label update logic every 10 seconds
    stateInterval = setInterval(() => {
      setShippingStateIndex((prevIndex) => (prevIndex + 1) % shippingStates.length);
    }, 10000);

    return () => {
      clearInterval(shippingInterval);
      clearInterval(stateInterval);
    };
  }, [isShipping]);

  const handleShipOrder = () => {
    fetch('http://localhost:5005/api/start-shipping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(response => {
      if (response.ok) {
        console.log('Shipping started successfully');
      } else {
        console.error('Failed to start shipping');
      }
    });
    if (!isShipping) {
      setIsShipping(true);
      setShippingStateIndex(0);
    }
  };

  return (
    <div className="App">
      <div className="shipping-container">
        <button className="ship-button" onClick={handleShipOrder} disabled={isShipping}>
          Ship Order
        </button>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="shipping-state">
          {shippingStates[shippingStateIndex]}
        </div>
      </div>
    </div>
  );
};

export default App;
