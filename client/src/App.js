import React, { useState, useEffect } from 'react';
import './App.css';
import InfoPanel from './components/info-panel';
import GameWindow from './components/game-window';
import InitialView from './components/initial-view';
import Leaderboard from './components/leaderboard';
import HowToPlay from './components/how-to-play';
import EndGameView from './components/end-game-view';
import { checkSession, fetchGameInfo, fetchLeaderboard, resetPlayer } from './api';
import LeftWindow from './components/left-window';
import TitleBar from './components/title-bar';
import RightWindow from './components/right-window';
import Cookies from 'js-cookie';

// CONSTANTS
const gameTitle = "Shipper Game";
const gameSubTitle = "The game of efficient shipping! ™";

const App = () => {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
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
            console.log('Game Info:', data);
            if (data.error === 'No player found') {
              setIsLoggedIn(false);
              setGameInfo(null);
            } else {
              setGameInfo(data);
            }
          })
          .catch(error => console.error('Failed to load game info:', error));
      };

      fetchGameInfoInterval();
      const interval = setInterval(fetchGameInfoInterval, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      const hasSeenHowToPlay = Cookies.get('hasSeenHowToPlay');
      if (!hasSeenHowToPlay) {
        setIsHowToPlayOpen(true);
        Cookies.set('hasSeenHowToPlay', 'true', { expires: 365 });
      }
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

  const toggleLeaderboard = () => {
    if (!isLeaderboardOpen) {
      fetchLeaderboard()
        .then(data => setLeaderboardData(data))
        .catch(error => console.error('Failed to fetch leaderboard:', error));
    }
    setIsLeaderboardOpen(!isLeaderboardOpen);
  };

  const toggleHowToPlay = () => {
    setIsHowToPlayOpen(!isHowToPlayOpen);
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

  const handleNewGame = () => {
    handleResetPlayer();
  };

  const handleSettings = () => {
    // Implement settings functionality here
    console.log('Settings button clicked');
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <TitleBar 
          gameTitle={gameTitle}
          gameSubTitle={gameSubTitle}
          onNewGame={handleNewGame} 
          onToggleLeaderboard={toggleLeaderboard} 
          onHowToPlay={toggleHowToPlay} 
          onSettings={handleSettings} 
        />
        <InitialView onAccountCreated={handleAccountCreated} />
      </div>
    );
  }

  return (
    <div className="App">
      {gameInfo && (
        <>
          <TitleBar 
            gameTitle={gameTitle}
            gameSubTitle={gameSubTitle}
            onNewGame={handleNewGame} 
            onToggleLeaderboard={toggleLeaderboard} 
            onHowToPlay={toggleHowToPlay} 
            onSettings={handleSettings} 
          />
          <div className="content-wrapper">
            <LeftWindow
              orders={gameInfo.orders} 
              active_order={gameInfo.active_order} 
              secondsUntilNextOrder={gameInfo.secondsUntilNextOrder}
            />
            <div className="main-content">
              {gameInfo.game_active ? (
                <GameWindow 
                  gameInfo={gameInfo} 
                />
              ) : (
                <EndGameView 
                  gameInfo={gameInfo} 
                  onNewGame={handleNewGame} 
                />
              )}
              <Leaderboard
                isOpen={isLeaderboardOpen}
                onClose={toggleLeaderboard}
                ordersShipped={leaderboardData.ordersShipped}
                moneyEarned={leaderboardData.moneyEarned}
                techLevel={leaderboardData.techLevel}
              />
              <HowToPlay
                isOpen={isHowToPlayOpen}
                onClose={toggleHowToPlay}
                gameTitle={gameTitle}
              />
            </div>
            <RightWindow />
          </div>
          {gameInfo.game_active &&
            <InfoPanel gameInfo={gameInfo} />
          }
        </>
      )}
    </div>
  );
};

export default App;
