import React, { useState, useEffect } from 'react';
import './info-panel.css';

const getReputationEmoji = (reputation) => {
  if (reputation === 100) return '🌟';
  if (reputation >= 90) return '😁';
  if (reputation >= 80) return '😊';
  if (reputation >= 70) return '🙂';
  if (reputation >= 60) return '😌';
  if (reputation >= 50) return '😐';
  if (reputation >= 40) return '😕';
  if (reputation >= 30) return '😟';
  if (reputation >= 20) return '😢';
  if (reputation >= 10) return '😭';
  return '💀';
};

const formatCurrency = (amount) => {
  if (amount === null) return 'N/A';
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatTimeRemaining = (timeRemaining) => {
  return timeRemaining > 60 ? `${Math.floor(timeRemaining / 60)} mins` : `${timeRemaining}s`;
};

const isMobileMode = window.innerWidth <= 600;

const InfoPanel = ({ gameInfo }) => {
  const defaultPlayer = {
    business_name: 'N/A',
    money: 0,
    orders_shipped: 0,
    reputation: 0,
  };

  const [prevPlayer, setPrevPlayer] = useState({});
  const [player, setPlayer] = useState(gameInfo ? gameInfo.player : defaultPlayer);
  const [deltas, setDeltas] = useState({});

  useEffect(() => {
    if (gameInfo) {
      setPrevPlayer(player);
      setPlayer(gameInfo.player);
      setDeltas({
        money: gameInfo.player.money - player.money,
        orders_shipped: gameInfo.player.orders_shipped - player.orders_shipped,
        reputation: gameInfo.player.reputation - player.reputation,
      });
    }
  }, [gameInfo]);

  const getDeltaClass = (delta) => {
    if (delta > 0) return 'delta-positive';
    if (delta < 0) return 'delta-negative';
    return '';
  };

  const renderDelta = (delta) => {
    if (delta === 0) return null;
    return <span className={`delta-label ${getDeltaClass(delta)}`}>{delta > 0 ? `+${delta}` : delta}</span>;
  };

  return (
    <div className="info-panel">
      <div className="info-values">
        <p>🌐 {player.business_name}</p>
        <p>
          💰 ${formatCurrency(player.money)}
          {renderDelta(deltas.money)}
        </p>
        <p>
          {isMobileMode ? '📦' : '📦 Shipped:'} {player.orders_shipped}
          {renderDelta(deltas.orders_shipped)}
        </p>
        <p>
          {getReputationEmoji(player.reputation)} {isMobileMode ? '' : 'Reputation: '}{player.reputation}
          {renderDelta(deltas.reputation)}
        </p>
        <p>{isMobileMode ? '⏳' : '⏳ Time Remaining:'} {formatTimeRemaining(gameInfo && gameInfo.timeRemaining ? gameInfo.timeRemaining : 0)}</p>
      </div>
    </div>
  );
};

export default InfoPanel;
