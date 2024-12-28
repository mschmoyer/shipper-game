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
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}k`;
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatDataValue = (orders) => {
  // return 0 if orders is null or not a number
  if (orders === null || isNaN(orders)) return 0;
  if (orders >= 1e6) return `${(orders / 1e6).toFixed(1)}M`;
  if (orders >= 1e3) return `${(orders / 1e3).toFixed(1)}k`;
  return orders;
};

const formatTimeRemaining = (timeRemaining) => {
  return timeRemaining > 60 ? `${Math.floor(timeRemaining / 60)} mins` : `${timeRemaining}s`;
};

const isMobileMode = window.innerWidth <= 600;
console.log('isMobileMode:', isMobileMode);

const InfoPanel = ({ gameInfo }) => {
  const defaultBusiness = {
    business_name: 'N/A',
    money: 0,
    orders_shipped: 0,
    reputation: 0,
  };

  const [business, setBusiness] = useState(gameInfo ? gameInfo.business : defaultBusiness);
  const [deltas, setDeltas] = useState({});

  useEffect(() => {
    if (gameInfo) {
      setBusiness(gameInfo.business);
      setDeltas({
        money: gameInfo ? gameInfo.business.money - business.money : 0,
        orders_shipped: gameInfo ? gameInfo.business.orders_shipped - business.orders_shipped : 0,
        reputation: gameInfo ? gameInfo.business.reputation.score - business.reputation.score : 0,
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
    if (delta === 0 || isNaN(delta)) return null;
    let smallDelta = formatDataValue(Math.abs(delta));
    return <span className={`delta-label ${getDeltaClass(delta)}`}>{delta > 0 ? `+${formatDataValue(smallDelta)}` : formatDataValue(smallDelta)}</span>;
  };

  const orders_shipped_value = business.orders_shipped ? business.orders_shipped : 0;
  const money_value = business.money ? business.money : 1000;
  const reputation_value = business.reputation ? business.reputation.score : 100;

  return (
    <div className="info-panel">
      <div className="info-values">
        <div className={money_value < 0 ? 'negative-money' : ''}>
          <p className="info-values-emoji">💰</p>
          <p>{!isMobileMode ? 'Funds: ' : ''}${formatCurrency(money_value)}{renderDelta(deltas.money)}</p>
        </div>
        <div>
          <p className="info-values-emoji">🚚</p>
          <p>{!isMobileMode ? 'Shipped: ' : ''}{formatDataValue(orders_shipped_value)}{renderDelta(deltas.orders_shipped)}</p>
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
