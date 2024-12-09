import React from 'react';
import './order-view.css';

const OrderView = ({ gameInfo }) => {
  const { orders, active_order, secondsUntilNextOrder } = gameInfo;
  const isMobileMode = window.innerWidth <= 600;

  const getTimeDelta = (deltaSeconds, isActive) => {
    if (isActive) {
      return { text: `${deltaSeconds}s`, isUrgent: false, isVeryUrgent: false };
    }
    if (deltaSeconds <= 15) {
      return { text: `${deltaSeconds}s`, isUrgent: true, isVeryUrgent: true };
    } else if (deltaSeconds <= 60) {
      return { text: `${deltaSeconds}s`, isUrgent: true, isVeryUrgent: false };
    } else {
      const deltaMinutes = Math.floor(deltaSeconds / 60);
      return { text: `${deltaMinutes} min`, isUrgent: false, isVeryUrgent: false };
    }
  };

  const activeOrderId = active_order ? active_order.id : null;
  const sortedOrders = [...orders].sort((a, b) => (a.id === activeOrderId ? -1 : b.id === activeOrderId ? 1 : 0));

  return (
    <div className="order-view">
      {sortedOrders.slice(0, 10).map((order, index) => {
        const timeDelta = getTimeDelta(order.delta_to_due_date, order.id === activeOrderId);
        return (
          <div key={index} className={`order-card ${order.id === activeOrderId ? 'active' : ''} ${timeDelta.isUrgent ? 'urgent' : ''} ${timeDelta.isVeryUrgent ? 'very-urgent' : ''}`}>
            <p>Order: {timeDelta.isVeryUrgent ? '🔥' : timeDelta.isUrgent && '⚠️'}</p>
            <p> {!isMobileMode ? '' : ''} #{order.id} {order.id === activeOrderId && '🚚'}</p>
            <p>⏳ {isMobileMode ? timeDelta.text : `${timeDelta.text}`}</p>
          </div>
        );
      })}
      {orders.length < 10 && Array.from({ length: 10 - orders.length }).map((_, index) => (
        <div key={`empty-${index}`} className="order-card empty">
          {index === 0 && secondsUntilNextOrder > 0 ? (
            <>
              <p>{isMobileMode ? 'Next:' : 'New Order in:'} {secondsUntilNextOrder}s...</p>
              <p>🚚</p>
            </>
          ) : (
            <>
              <p>Waiting...</p>
              <p>.</p>
              <p>⏳</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default OrderView;