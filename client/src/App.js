import React, { useState, useEffect } from 'react';
import './App.css';
import InfoPanel from './components/info-panel';
import ShippingContainer from './components/shipping-container';
import InitialView from './components/initial-view';
import { checkSession, fetchGameInfo } from './api';

const App = () => {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkSession()
      .then(data => {
        if (data.loggedIn) {
          setIsLoggedIn(true);
        }
      })
      .catch(error => console.error('Failed to check session:', error));
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchGameInfoInterval = () => {
        fetchGameInfo()
          .then(data => {
            setGameInfo(data);
          })
          .catch(error => console.error('Failed to load game info:', error));
      };

      fetchGameInfoInterval();
      const interval = setInterval(fetchGameInfoInterval, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleAccountCreated = () => {
    checkSession()
      .then(data => {
        if (data.loggedIn) {
          setIsLoggedIn(true);
        }
      })
      .catch(error => console.error('Failed to check session:', error));
  };

  if (!isLoggedIn) {
    return <InitialView onAccountCreated={handleAccountCreated} />;
  }

  return (
    <div className="App">
      {gameInfo && (
        <>
          <InfoPanel gameInfo={gameInfo} />
          <ShippingContainer gameInfo={gameInfo} />
        </>
      )}
    </div>
  );
};

export default App;
