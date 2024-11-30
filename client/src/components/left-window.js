import React from 'react';
import './left-window.css';

const LeftWindow = ({ orders, activeOrder, secondsUntilNextOrder }) => {
  const getTimeDelta = (dueByTime) => {
    const now = new Date();
    const dueBy = new Date(dueByTime);
    const deltaSeconds = Math.floor((dueBy - now) / 1000);

    if (deltaSeconds <= 60) {
      return { text: `${deltaSeconds} seconds`, isUrgent: true };
    } else {
      const deltaMinutes = Math.floor(deltaSeconds / 60);
      return { text: `${deltaMinutes} minutes`, isUrgent: false };
    }
  };

  const activeOrderId = activeOrder ? activeOrder.id : null;
  console.log('Active Order ID:', activeOrderId);
  const sortedOrders = [...orders].sort((a, b) => (a.id === activeOrderId ? -1 : b.id === activeOrderId ? 1 : 0));

  return (
    <div className="left-window">
      {sortedOrders.slice(0, 7).map((order, index) => {
        const timeDelta = getTimeDelta(order.dueByTime);
        console.log('Order:', order.id, 'Active:', order.id === activeOrderId);
        return (
          <div key={index} className={`order-card ${order.id === activeOrderId ? 'active' : ''} ${timeDelta.isUrgent ? 'urgent' : ''}`}>
            <p>Order #{order.id} {order.id === activeOrderId && '🚚'}</p>
            <p>Due In: {timeDelta.text} {timeDelta.isUrgent && '⚠️'}</p>
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