import React from 'react';
import './order-card.css';
import CustomerImage from './customer-image';

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
      <div className="order-status">
        {timeDelta.isVeryUrgent ? '🔥' : timeDelta.isUrgent && '⚠️'} 
      </div>
      <p>
        {isMobileMode ? timeDelta.text : `${timeDelta.text}`}
        <span className="product-emojis">
          {order.required_products && order.required_products.map((product, index) => (
            <span key={index}>{product.emoji}</span>
          ))}
        </span>
      </p>
    </div>
  );
};

export default OrderCard;
