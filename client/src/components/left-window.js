import React from 'react';
import './left-window.css';

const LeftWindow = ({ orders }) => {
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

  return (
    <div className="left-window">
      {orders.slice(0, 7).map((order, index) => {
        const timeDelta = getTimeDelta(order.dueByTime);
        return (
          <div key={index} className={`order-card ${timeDelta.isUrgent ? 'urgent' : ''}`}>
            <h3>{order.title}</h3>
            <p>Order #{order.id}</p>
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