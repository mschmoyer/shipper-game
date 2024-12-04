import React from 'react';
import './left-window.css';

const LeftWindow = ({ gameInfo }) => {
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
    <div className="left-window">
      {sortedOrders.slice(0, 7).map((order, index) => {
        const timeDelta = getTimeDelta(order.delta_to_due_date, order.id === activeOrderId);
        return (
          <div key={index} className={`order-card ${order.id === activeOrderId ? 'active' : ''} ${timeDelta.isUrgent ? 'urgent' : ''} ${timeDelta.isVeryUrgent ? 'very-urgent' : ''}`}>
            <p>{!isMobileMode ? 'Order' : ''} #{order.id} {order.id === activeOrderId && '🚚'}</p>
            <p>Due: {isMobileMode ? timeDelta.text : `Due in ${timeDelta.text}`} {timeDelta.isVeryUrgent ? '🔥' : timeDelta.isUrgent && '⚠️'}</p>
            <p>{!isMobileMode ? 'Dist: ' : ''} {order.distance} mi</p>
          </div>
        );
      })}
      {orders.length > 7 && <p>({orders.length - 7} more)</p>}
      {orders.length < 7 && Array.from({ length: 7 - orders.length }).map((_, index) => (
        <div key={`empty-${index}`} className="order-card empty">
          {index === 0 && secondsUntilNextOrder > 0 ? (
            <>
              <p>{isMobileMode ? 'Next:' : 'New Order in:'} {secondsUntilNextOrder}s...</p>
              <p> </p>
              <p>🚚</p>
            </>
          ) : (
            <>
              <p>Waiting...</p>
              <p> </p>
              <p>⏳</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default LeftWindow;