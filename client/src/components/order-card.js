import React from 'react';
import './order-card.css';
import CustomerImage from './reusable/customer-image';

const OrderCard = ({ order, timeDelta, isActive, isMobileMode, isEmpty, secondsUntilNextOrder }) => {
  if (isEmpty) {
    return (
      <div className="order-card empty">
        {secondsUntilNextOrder > 0 ? (
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
    );
  }

  const customerFaceId = (order.id % 25) + 1;

  return (
    <div className={`order-card ${isActive ? 'active' : ''} ${timeDelta.isUrgent ? 'urgent' : ''} ${timeDelta.isVeryUrgent ? 'very-urgent' : ''}`}>
      <CustomerImage customerFaceId={customerFaceId} width={48} height={48} />
      <p>Order: {timeDelta.isVeryUrgent ? '🔥' : timeDelta.isUrgent && '⚠️'}</p>
      <p> {!isMobileMode ? '' : ''} #{order.id} {isActive && '🚚'}</p>
      <p>⏳ {isMobileMode ? timeDelta.text : `${timeDelta.text}`}</p>
    </div>
  );
};

export default OrderCard;
