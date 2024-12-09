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
console.log('isMobileMode:', isMobileMode);

const InfoPanel = ({ gameInfo }) => {
  const defaultPlayer = {
    business_name: 'N/A',
    money: 0,
    orders_shipped: 0,
    reputation: 0,
  };

  const [player, setPlayer] = useState(gameInfo ? gameInfo.player : defaultPlayer);
  const [deltas, setDeltas] = useState({});

  useEffect(() => {
    if (gameInfo) {
      setPlayer(gameInfo.player);
      setDeltas({
        money: gameInfo.player.money - player.money,
        orders_shipped: gameInfo.player.orders_shipped - player.orders_shipped,
        reputation: gameInfo.player.reputation.score - player.reputation.score,
      });
    }
  }, [gameInfo]);

  const getDeltaClass = (delta) => {
    if (delta > 0) return 'delta-positive';
    if (delta < 0) return 'delta-negative';
    if(delta > 0  || delta < 0) return 'delta active!';
    return '';
  };

  const renderDelta = (delta) => {
    if (delta === 0) return null;
    return <span className={`delta-label ${getDeltaClass(delta)}`}>{delta > 0 ? `+${delta}` : delta}</span>;
  };

  const orders_shipped_value = player.orders_shipped ? player.orders_shipped : 0;
  const inventory_value = gameInfo && gameInfo.inventory ? gameInfo.inventory[0].on_hand : 0;
  const money_value = player.money ? player.money : 1000;
  const reputation_value = player.reputation ? player.reputation.score : 100;

  return (
    <div className="info-panel">
      <div className="info-values">
        <div className={money_value < 0 ? 'negative-money' : ''}>
          <p className="info-values-emoji">💰</p>
          <p>{!isMobileMode ? 'Funds: ' : ''}${formatCurrency(money_value)}{renderDelta(deltas.money)}</p>
        </div>
        <div>
          <p className="info-values-emoji">📦</p>
          <p>{!isMobileMode ? 'Shipped: ' : ''}{orders_shipped_value}{renderDelta(deltas.orders_shipped)}</p>
        </div>
        <div>
          <p className="info-values-emoji">{getReputationEmoji(reputation_value)}</p>
          <p>{!isMobileMode ? 'Reputation: ' : ''}{reputation_value}{renderDelta(deltas.reputation)}</p>
        </div>
        <div>
          <p className="info-values-emoji">⏳</p>
          <p>{!isMobileMode ? 'Time Left: ' : ''}{formatTimeRemaining(gameInfo && gameInfo.timeRemaining ? gameInfo.timeRemaining : 15 * 60)}</p>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
