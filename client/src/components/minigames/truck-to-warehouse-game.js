import React, { useEffect, useState } from 'react';
import { completeTruckToWarehouseGame } from '../../api'; // Import the API function
import './truck-to-warehouse-game.css';

const obstacleEmojis = ['🌵', '🚧', '🛑', '⚠️', '🚜'];

const isMobileMode = window.innerWidth <= 600;

const getRandomPosition = () => ({
  x: Math.floor(Math.random() * 90) + 5,
  y: Math.floor(Math.random() * 90) + 5,
});

const TruckToWarehouseGame = ({ onClose }) => {
  const [truckPosition, setTruckPosition] = useState({ x: 0, y: 50 });
  const [truckDirection, setTruckDirection] = useState(0); // 0: right, 90: down, 180: left, 270: up
  const [velocity, setVelocity] = useState(0); // Velocity in tiles per second
  const [gameMessage, setGameMessage] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [obstacles] = useState(
    Array.from({ length: 5 }, () => ({
      position: getRandomPosition(),
      emoji: obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)],
    }))
  );
  const [keysPressed, setKeysPressed] = useState({});
  const [gameCompleted, setGameCompleted] = useState(false);

  const handleSpeedUp = () => setVelocity((prev) => Math.min(prev + 1, 30));
  const handleSpeedDown = () => setVelocity((prev) => Math.max(prev - 1, -30));
  const handleTurnLeft = () => setTruckDirection((prev) => (prev - 90) % 360);
  const handleTurnRight = () => setTruckDirection((prev) => (prev + 90) % 360);

  useEffect(() => {
    const handleKeyDown = (event) => {
      setKeysPressed((prev) => ({ ...prev, [event.key]: true }));
    };

    const handleKeyUp = (event) => {
      setKeysPressed((prev) => ({ ...prev, [event.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTruckPosition((prev) => {
        let newVelocity = velocity;
        let newDirection = truckDirection;

        if (keysPressed['ArrowUp']) {
          newVelocity = Math.min(velocity + 1, 30);
        }
        if (keysPressed['ArrowDown']) {
          newVelocity = Math.max(velocity - 1, -30);
        }
        if (keysPressed['ArrowLeft']) {
          newDirection = (truckDirection - 90) % 360;
        }
        if (keysPressed['ArrowRight']) {
          newDirection = (truckDirection + 90) % 360;
        }

        setVelocity(newVelocity);
        setTruckDirection(newDirection);

        const newX = prev.x + Math.cos(newDirection * (Math.PI / 180)) * newVelocity * 0.1;
        const newY = prev.y + Math.sin(newDirection * (Math.PI / 180)) * newVelocity * 0.1;
        return { x: newX, y: newY };
      });
    }, 100); // Update position every 100ms

    return () => clearInterval(interval);
  }, [keysPressed, truckDirection, velocity]);

  useEffect(() => {
    let completed = gameCompleted;

    if (truckPosition.x < 0 || truckPosition.x > 100 || truckPosition.y < 0 || truckPosition.y > 100) {
      if (!completed) {
        setGameMessage('You failed! The truck went off the edge. Your stock level has been set to zero.');
        completeTruckToWarehouseGame(false); // Call API with failure
        setGameCompleted(true);
        completed = true;
        setTimeout(onClose, 4000);
      }
    } else if (Math.abs(truckPosition.x - 85) < 5 && Math.abs(truckPosition.y - 50) < 5) {
      if (!completed) {
        setGameMessage('Success! The truck reached the factory.');
        completeTruckToWarehouseGame(true); // Call API with success
        setGameCompleted(true);
        completed = true;
        setTimeout(onClose, 4000);
      }
    } else {
      obstacles.forEach(obstacle => {
        if (Math.abs(truckPosition.x - obstacle.position.x) < 5 && Math.abs(truckPosition.y - obstacle.position.y) < 5) {
          if (!completed) {
            setGameMessage('You failed! The truck hit an obstacle. Your stock level has been set to zero.');
            completeTruckToWarehouseGame(false); // Call API with failure
            setGameCompleted(true);
            completed = true;
            setTimeout(onClose, 4000);
          }
        }
      });
    }
  }, [truckPosition, onClose, obstacles, gameCompleted]);

  return (
    <div className="minigame-modal">
      <div className="minigame-content">
        {showInstructions ? (
          <div>
            <p>You forgot to ask a supplier to make the components you need. Quickly drive your truck to get the parts. Use the arrow keys to drive the truck to the factory.</p>
            <button onClick={() => setShowInstructions(false)}>Start</button>
          </div>
        ) : gameMessage ? (
          <p>{gameMessage}</p>
        ) : (
          <div className="minigame-area">
            <div
              className="truck"
              style={{
                left: `${truckPosition.x}%`,
                top: `${truckPosition.y}%`,
                transform: `rotate(${truckDirection}deg)`,
                transition: 'left 0.1s, top 0.1s',
              }}
            >
              🚚
            </div>
            <div className="factory">🏭</div>
            {obstacles.map((obstacle, index) => (
              <div
                key={index}
                className="obstacle"
                style={{
                  left: `${obstacle.position.x}%`,
                  top: `${obstacle.position.y}%`,
                }}
              >
                {obstacle.emoji}
              </div>
            ))}
            {isMobileMode && (
              <div className="mobile-controls">
                <button onClick={handleSpeedUp}>⬆️</button>
                <button onClick={handleSpeedDown}>⬇️</button>
                <button onClick={handleTurnLeft}>⬅️</button>
                <button onClick={handleTurnRight}>➡️</button>
              </div>
            )}
          </div>
        )}
        <p className="tech-prompt">
          Purchase the Purchase Order technology to avoid having this problem again! 📦
          <br />
          <strong>Note:</strong> Failing this game will set your stock level to zero.
        </p>
      </div>
    </div>
  );
};

export default TruckToWarehouseGame;