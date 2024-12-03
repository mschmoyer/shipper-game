import React from 'react';
import './left-window.css';

const LeftWindow = ({ orders, active_order, secondsUntilNextOrder }) => {
  const getTimeDelta = (deltaSeconds, isActive) => {
    if (isActive) {
      return { text: `${deltaSeconds} seconds`, isUrgent: false, isVeryUrgent: false };
    }
    if (deltaSeconds <= 15) {
      return { text: `${deltaSeconds} seconds`, isUrgent: true, isVeryUrgent: true };
    } else if (deltaSeconds <= 60) {
      return { text: `${deltaSeconds} seconds`, isUrgent: true, isVeryUrgent: false };
    } else {
      const deltaMinutes = Math.floor(deltaSeconds / 60);
      return { text: `${deltaMinutes} minutes`, isUrgent: false, isVeryUrgent: false };
    }
  };

  const activeOrderId = active_order ? active_order.id : null;
  const sortedOrders = [...orders].sort((a, b) => (a.id === activeOrderId ? -1 : b.id === activeOrderId ? 1 : 0));

  return (
    <div className="left-window">
      {sortedOrders.slice(0, 7).map((order, index) => {
        const timeDelta = getTimeDelta(order.delta_to_due_date, order.id === activeOrderId);
        return (
          <div key={index} className={`order-card ${order.id === activeOrderId ? 'active' : ''} ${timeDelta.isUrgent ? 'urgent' : ''} ${timeDelta.isVeryUrgent ? 'very-urgent' : ''}`}>
            <p>Order #{order.id} {order.id === activeOrderId && '🚚'}</p>
            <p>Due In: {timeDelta.text} {timeDelta.isVeryUrgent ? '🔥' : timeDelta.isUrgent && '⚠️'}</p>
            <p>Distance: {order.distance} miles</p>
          </div>
        );
      })}
      {orders.length > 7 && <p>(and {orders.length - 7} more...)</p>}
      {orders.length < 7 && Array.from({ length: 7 - orders.length }).map((_, index) => (
        <div key={`empty-${index}`} className="order-card empty">
          {index === 0 && secondsUntilNextOrder > 0 ? (
            <>
              <p>New order in {secondsUntilNextOrder}s...</p>
              <p>.</p>
              <p>🚚</p>
            </>
          ) : (
            <>
              <p>Waiting for orders...</p>
              <p>.</p>
              <p>⏳</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default LeftWindow;