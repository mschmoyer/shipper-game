import React, { useState, useEffect } from 'react';
import './App.css';
import InfoPanel from './components/info-panel';
import GameWindow from './components/game-window';
import InitialView from './components/initial-view';
import Leaderboard from './components/leaderboard';
import HowToPlay from './components/how-to-play';
import EndGameView from './components/end-game-view';
import { checkSession, fetchGameInfo, resetPlayer, endGame } from './api';
import OrderView from './components/order-view';
import TitleBar from './components/title-bar';
import RightWindow from './components/right-window';
import Cookies from 'js-cookie';

// CONSTANTS
const gameTitle = "Click & Ship Tycoon";
const gameSubTitle = "The game of efficient shipping! ™";

const App = () => {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);

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

  // The big Game Info fetcher loop
  useEffect(() => {
    if (isLoggedIn && ((gameInfo && gameInfo.game_status === 'active') || !gameInfo)) {
      const fetchGameInfoInterval = () => {
        fetchGameInfo()
          .then(data => {
            if (data.error === 'No player found') {
              setIsLoggedIn(false);
              setGameInfo(null);
            } else {
              setGameInfo(data);
              setIsGameActive(data.game_active);
            }
          })
          .catch(error => console.error('Failed to load game info:', error));
      };

      fetchGameInfoInterval();
      const interval = setInterval(fetchGameInfoInterval, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, isGameActive]);

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
          setIsGameActive(true);
        }
      })
      .catch(error => console.error('Failed to check session:', error));
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

  const handleEndGame = () => {
    if (gameInfo && gameInfo.game_active) {
      endGame()
        .then(data => {
          if (data.success) {
            setIsGameActive(false);
          }
        })
        .catch(error => console.error('Failed to end game:', error));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="centered-container">
          <InfoPanel gameInfo={gameInfo} />
          <InitialView onAccountCreated={handleAccountCreated} />
          <TitleBar 
            onEndGame={handleEndGame} 
            isGameActive={gameInfo && gameInfo.game_active}
            gameInfo={gameInfo}
          />          
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="centered-container">
        {gameInfo && (
          <>
            <InfoPanel gameInfo={gameInfo} />
            {gameInfo.game_active && 
              <OrderView gameInfo={gameInfo} />
            }
            <div className="content-wrapper">
              
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
              </div>
              {false && 
                <RightWindow />
              }
            </div>
            <TitleBar 
              onEndGame={handleEndGame} 
              isGameActive={gameInfo && gameInfo.game_active}
              gameInfo={gameInfo}
            />
            
          </>
        )}
      </div>
    </div>
  );
};

export default App;
