import React from 'react';
import './customer-image.css';

const CustomerImage = ({ customerFaceId, width = 48, height = 48 }) => {
  const originalTileSize = 128;
  const maxTilesPerRow = 5;
  const row = Math.floor((customerFaceId - 1) / maxTilesPerRow);
  const col = (customerFaceId - 1) % maxTilesPerRow;

  const backgroundPositionX = col * originalTileSize;
  const backgroundPositionY = row * originalTileSize;

  const style = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundPosition: `${backgroundPositionX * (width / originalTileSize)}px ${backgroundPositionY * (height / originalTileSize)}px`,
    backgroundSize: `${originalTileSize * maxTilesPerRow * (width / originalTileSize)}px ${originalTileSize * maxTilesPerRow * (height / originalTileSize)}px`,
  };

  return <div className="customer-image" style={style} />;
};

export default CustomerImage;