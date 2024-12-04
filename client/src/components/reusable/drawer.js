import React from 'react';
import './drawer.css';

const Drawer = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'drawer-overlay') {
      onClose();
    }
  };

  return (
    <div className="drawer-overlay" onClick={handleOverlayClick}>
      <div className={`drawer-container ${className}`}>
        <div className="drawer-header">
          <div className="drawer-title">{title}</div>
          <button className="close-button" onClick={onClose}>✖</button>
        </div>
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;