import React, { useState, useEffect } from 'react';
import './App.css';
import InfoPanel from './components/info-panel';
import ShippingContainer from './components/shipping-container';
import InitialView from './components/initial-view';
import Toolbar from './components/toolbar';
import Leaderboard from './components/leaderboard';
import { checkSession, fetchGameInfo, fetchLeaderboard } from './api';

const App = () => {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [autoShipEnabled, setAutoShipEnabled] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({ ordersShipped: [], moneyEarned: [], techLevel: [] });

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

  useEffect(() => {
    if (gameInfo) {
      console.log('Game Info:', gameInfo);
      const hasAutoShipTech = gameInfo.acquiredTechnologies.some(tech => tech.techCode === 'hire_warehouse_worker');
      if (hasAutoShipTech) {
        console.log('AutoShip Enabled');
        setAutoShipEnabled(true);
      } else {
        console.log('AutoShip Disabled');
        setAutoShipEnabled(false);
      }
    }
  }, [gameInfo]);

  const handleAccountCreated = () => {
    checkSession()
      .then(data => {
        if (data.loggedIn) {
          setIsLoggedIn(true);
        }
      })
      .catch(error => console.error('Failed to check session:', error));
  };

  const toggleLeaderboard = () => {
    if (!isLeaderboardOpen) {
      fetchLeaderboard()
        .then(data => setLeaderboardData(data))
        .catch(error => console.error('Failed to fetch leaderboard:', error));
    }
    setIsLeaderboardOpen(!isLeaderboardOpen);
  };

  if (!isLoggedIn) {
    return <InitialView onAccountCreated={handleAccountCreated} />;
  }

  return (
    <div className="App">
      {gameInfo && (
        <>
          <InfoPanel gameInfo={gameInfo} />
          <ShippingContainer gameInfo={gameInfo} autoShipEnabled={autoShipEnabled} />
          <Toolbar availableTechnologies={gameInfo.availableTechnologies} />
          <button onClick={toggleLeaderboard}>Show Leaderboard</button>
          <Leaderboard
            isOpen={isLeaderboardOpen}
            onClose={toggleLeaderboard}
            ordersShipped={leaderboardData.ordersShipped}
            moneyEarned={leaderboardData.moneyEarned}
            techLevel={leaderboardData.techLevel}
          />
        </>
      )}
    </div>
  );
};

export default App;
