import React, { useState, useEffect } from 'react';
import './App.css';
import InfoPanel from './components/info-panel';
import ShippingContainer from './components/shipping-container';
import InitialView from './components/initial-view';
import Toolbar from './components/toolbar';
import Leaderboard from './components/leaderboard';
import { checkSession, fetchGameInfo, fetchLeaderboard, resetPlayer } from './api';
import LeftWindow from './components/left-window';

const App = () => {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [autoShipEnabled, setAutoShipEnabled] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({ ordersShipped: [], moneyEarned: [], techLevel: [] });

  // Check if the player is logged in
  useEffect(() => {
    checkSession()
      .then(data => {
        if (data.loggedIn) {
          setIsLoggedIn(true);
        }
      })
      .catch(error => console.error('Failed to check session:', error));
  }, []);

  // Fetch game info every 400ms if the player is logged in
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

  // Check if the player has the AutoShip technology
  useEffect(() => {
    if (gameInfo) {
      const hasAutoShipTech = gameInfo.acquiredTechnologies.some(tech => tech.techCode === 'hire_warehouse_worker');
      if (hasAutoShipTech) {
        setAutoShipEnabled(true);
      } else {
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

  const handleResetPlayer = () => {
    resetPlayer()
      .then(data => {
        if (data.success) {
          setIsLoggedIn(false);
          setGameInfo(null);
        }
      })
      .catch(error => console.error('Failed to reset player:', error));
  };

  if (!isLoggedIn) {
    return <InitialView onAccountCreated={handleAccountCreated} />;
  }

  return (
    <div className="App">
      {gameInfo && (
        <>
          <LeftWindow orders={gameInfo.orders} />
          <div className="main-content">
            <InfoPanel gameInfo={gameInfo} />
            <ShippingContainer gameInfo={gameInfo} autoShipEnabled={autoShipEnabled} />
            <Toolbar availableTechnologies={gameInfo.availableTechnologies} />
            <button onClick={toggleLeaderboard}>Show Leaderboard</button>
            <button onClick={handleResetPlayer}>Start New Business</button>
            <Leaderboard
              isOpen={isLeaderboardOpen}
              onClose={toggleLeaderboard}
              ordersShipped={leaderboardData.ordersShipped}
              moneyEarned={leaderboardData.moneyEarned}
              techLevel={leaderboardData.techLevel}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
