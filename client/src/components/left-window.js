import React from 'react';
import './left-window.css';

const LeftWindow = ({ orders, activeOrder }) => {
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
            <h3>{order.title}</h3>
            <p>Order #{order.id} {order.id === activeOrderId && '🚚'}</p>
            <p>Due In: {timeDelta.text} {timeDelta.isUrgent && '⚠️'}</p>
            <p>Distance: {order.distance} miles</p>
          </div>
        );
      })}
      {orders.length > 7 && <p>(and {orders.length - 7} more...)</p>}
    </div>
  );
};

export default LeftWindow;