import React from 'react';
import './order-view.css';
import OrderCard from './order-card';

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
          <OrderCard
            key={index}
            order={order}
            timeDelta={timeDelta}
            isActive={order.id === activeOrderId}
            isMobileMode={isMobileMode}
          />
        );
      })}
      {orders.length < 10 && Array.from({ length: 10 - orders.length }).map((_, index) => (
        <OrderCard
          key={`empty-${index}`}
          isEmpty={true}
          secondsUntilNextOrder={secondsUntilNextOrder}
          isMobileMode={isMobileMode}
        />
      ))}
    </div>
  );
};

export default OrderView;