const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { BASE_PRODUCTS_PER_BUILD } = require('../constants');

const assignRandomProductToPlayer = async (playerId) => {
  try {
    const products = await dbAll(
      'SELECT id FROM products ORDER BY RANDOM() LIMIT 1',
      [],
      'Failed to retrieve random product'
    );
    const productId = products[0].id;
    await dbRun(
      'INSERT INTO PlayerProducts (playerId, productId) VALUES (?, ?)',
      [playerId, productId],
      'Failed to assign product to player'
    );
    await dbRun(
      'INSERT INTO inventory (playerId, productId, onHand) VALUES (?, ?, ?)',
      [playerId, productId, 0],
      'Failed to add initial stock to inventory'
    );
  } catch (err) {
    throw new Error(err.message);
  }
};

const getActiveProduct = async (playerId) => {
  let product = await dbGet(
    'SELECT p.* FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
    [playerId],
    'Failed to retrieve product info'
  );

  const { steps: buildingSteps, totalDuration: buildingDuration } = await getBuildingSteps(playerId);
  product.buildingSteps = buildingSteps;
  product.buildingDuration = buildingDuration;

  const purchaseOrder = await dbGet(
    `SELECT * FROM purchaseOrders 
     WHERE playerId = ? AND active = true 
     LIMIT 1`,
    [playerId],
    'Failed to retrieve active purchase order'
  );

  const startTime = purchaseOrder && purchaseOrder.startTime ? new Date(purchaseOrder.startTime) : null;
  const currentTime = new Date();
  const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;
  const progress = startTime ? Math.min((elapsedTime / purchaseOrder.duration) * 100, 100) : 100;
  const isBuilding = startTime ? progress < 100 : false;

  product.quantityToBuild = BASE_PRODUCTS_PER_BUILD;
  product.purchaseOrderId = purchaseOrder ? purchaseOrder.id : null;
  product.progress = progress;
  product.isBuilding = isBuilding;
  product.startTime = startTime;
  product.elapsedTime = elapsedTime;

  return product;
};

const getInventoryInfo = async (playerId) => {
  return await dbAll(
    'SELECT * FROM inventory WHERE playerId = ?',
    [playerId],
    'Failed to retrieve inventory'
  );
};

const getBuildingSteps = async (playerId) => {
  const stepsPath = path.join(__dirname, '../game_data_files/building-steps.json');
  let steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

  const player = await dbGet(
    'SELECT buildingSpeed FROM player WHERE id = ?',
    [playerId],
    'Failed to retrieve player building speed'
  );

  const buildingSpeed = player.buildingSpeed;

  steps = steps.map(step => ({ ...step, duration: buildingSpeed }));

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  return { steps, totalDuration };
};

const startProductBuild = async (playerId) => {
  try {
    let activeOrder = await dbGet(
      `SELECT * FROM purchaseOrders 
       WHERE playerId = ? 
       AND active = true`,
      [playerId],
      'Failed to check active purchase orders'
    );

    if (activeOrder) {
      console.log('An active purchase order is still in progress');
      return { error: 'An active purchase order is still in progress' };
    }

    const { steps: buildingSteps, totalDuration: buildingDuration } = await getBuildingSteps(playerId);

    const activeProduct = await getActiveProduct(playerId);
    const quantity = BASE_PRODUCTS_PER_BUILD;

    // Check if the player has enough money to build the product. costToBuild * quantity
    const player = await dbGet(
      'SELECT * FROM player WHERE id = ?',
      [playerId],
      'Failed to retrieve player info'
    );
    const hasEnoughMoney = player.money >= activeProduct.costToBuild * quantity;
    if (!hasEnoughMoney) {
      console.log('Player does not have enough money to build the product');
      return { error: 'You do not have enough money to build the product' };
    }

    const totalBuildCost = activeProduct.costToBuild * quantity;

    // Deduct the money. 
    await dbRun(
      'UPDATE player SET money = money - ? WHERE id = ?',
      [totalBuildCost, playerId],
      'Failed to deduct money from player'
    );

    await dbRun(
      `INSERT INTO purchaseOrders (playerId, startTime, duration, active, quantity, productId) 
      VALUES 
      (?, ?, ?, true, ?, ?)`,
      [playerId, new Date().toISOString(), buildingDuration, quantity, activeProduct.id],
      'Failed to start product build'
    );

    console.log('Product build started successfully');
    return { 
      message: 'Product build started successfully.',
      buildingDuration,
      buildingSteps,
      costToBuild: activeProduct.costToBuild,
      quantity,
      totalCost: activeProduct.costToBuild * quantity
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

const ProductCompleted = async (purchaseOrderId, playerId) => {
  try {
    const purchaseOrder = await dbGet(
      'SELECT * FROM purchaseOrders WHERE id = ?',
      [purchaseOrderId],
      'Failed to retrieve purchase order'
    );

    console.log('Product build completed for purchaseOrderId:', purchaseOrderId);
    console.log('productId:', purchaseOrder.productId);
    await dbRun(
      'UPDATE inventory SET onHand = onHand + ? WHERE playerId = ? AND productId = ?',
      [purchaseOrder.quantity, playerId, purchaseOrder.productId],
      'Failed to update inventory'
    );

    await dbRun(
      'UPDATE purchaseOrders SET active = false WHERE id = ?',
      [purchaseOrderId],
      'Failed to update purchase order status'
    );

    console.log('Product build completed successfully.');
  } catch (err) {
    throw new Error(err.message);
  }
};

const productTick = async (playerId) => {
  try {
    const currentTime = new Date();
    const activeProducts = await dbAll(
      'SELECT * FROM purchaseOrders WHERE playerId = ? AND active = true',
      [playerId],
      'Failed to retrieve active purchase orders'
    );

    for (const product of activeProducts) {
      const startTime = new Date(product.startTime);
      const elapsedTime = (currentTime - startTime) / 1000;

      if (elapsedTime >= product.duration || product.starttime === null) {
        await ProductCompleted(product.id, playerId);
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = {
  assignRandomProductToPlayer,
  getActiveProduct,
  getInventoryInfo,
  getBuildingSteps,
  startProductBuild,
  ProductCompleted, // Ensure this is exported
  productTick // Ensure this is exported
};