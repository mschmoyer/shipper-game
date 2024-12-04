const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { BASE_PRODUCTS_PER_BUILD } = require('../constants');
const { increaseBuildingSpeed } = require('./player-logic');

const assignRandomProductToPlayer = async (playerId) => {
  const products = await dbAll(
    'SELECT id FROM products LIMIT 1',
    [],
    'Failed to retrieve random product'
  );
  console.log('products:', products);
  const productId = products[0].id;
  const new_product = await dbRun(
    'INSERT INTO player_products (player_id, product_id) VALUES ($1, $2) RETURNING *',
    [playerId, productId],
    'Failed to assign product to player'
  );
  await dbRun(
    'INSERT INTO inventory (player_id, product_id, on_hand) VALUES ($1, $2, $3)',
    [playerId, productId, 0],
    'Failed to add initial stock to inventory'
  );
  return new_product;
};

const getActiveProduct = async (playerId) => {
  let product = await dbGet(
    'SELECT p.*, pp.product_id FROM products p JOIN player_products pp ON p.id = pp.product_id WHERE pp.player_id = $1',
    [playerId],
    'Failed to retrieve product info'
  );

  const { building_steps, building_duration } = await getBuildingSteps(playerId);
  product.building_steps = building_steps;
  product.building_duration = building_duration;

  const purchase_order = await dbGet(
    `SELECT *, 
            EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time 
     FROM purchase_orders 
     WHERE player_id = $1 AND active = true 
     LIMIT 1`,
    [playerId],
    'Failed to retrieve active purchase order'
  );

  const start_time = purchase_order && purchase_order.start_time ? new Date(purchase_order.start_time) : null;
  const elapsed_time = purchase_order ? purchase_order.elapsed_time : 0;
  const progress = start_time ? Math.min((elapsed_time / purchase_order.duration) * 100, 100) : 100;
  const is_building = start_time ? progress < 100 : false;

  product.quantity_to_build = BASE_PRODUCTS_PER_BUILD;
  product.purchase_order_id = purchase_order ? purchase_order.id : null;
  product.progress = progress;
  product.is_building = is_building;
  product.start_time = start_time;
  product.elapsed_time = elapsed_time/1000;

  return product;
};

const getInventoryInfo = async (playerId) => {
  return await dbAll(
    'SELECT * FROM inventory WHERE player_id = $1',
    [playerId],
    'Failed to retrieve inventory'
  );
};

const getBuildingSteps = async (playerId) => {
  const stepsPath = path.join(__dirname, '../game_data_files/building-steps.json');
  let building_steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

  const player = await dbGet(
    'SELECT building_speed FROM player WHERE id = $1',
    [playerId],
    'Failed to retrieve player building speed'
  );

  const building_speed_seconds = player.building_speed / 1000;

  building_steps = building_steps.map(step => ({ ...step, duration: step.duration * building_speed_seconds }));

  const building_duration = Math.round((building_steps.length * building_speed_seconds) * 1000);
  return { building_steps, building_duration };
};

const startProductBuild = async (playerId) => {
  let activeOrder = await dbGet(
    `SELECT * FROM purchase_orders 
     WHERE player_id = $1 
     AND active = true`,
    [playerId],
    'Failed to check active purchase orders'
  );

  if (activeOrder) {
    console.log('An active purchase order is still in progress');
    return { error: 'An active purchase order is still in progress' };
  }

  const { building_steps, building_duration } = await getBuildingSteps(playerId);

  const activeProduct = await getActiveProduct(playerId);
  const quantity = BASE_PRODUCTS_PER_BUILD;

  // Check if the player has enough money to build the product. costToBuild * quantity
  const player = await dbGet(
    'SELECT * FROM player WHERE id = $1',
    [playerId],
    'Failed to retrieve player info'
  );
  const hasEnoughMoney = player.money >= activeProduct.cost_to_build * quantity;
  if (!hasEnoughMoney) {
    console.log('Player does not have enough money to build the product');
    return { error: 'You do not have enough money to build the product' };
  }

  // Increase the player speed 
  // TODO: Temporary. Where should we put this? 
  increaseBuildingSpeed(playerId);

  const totalBuildCost = activeProduct.cost_to_build * quantity;

  // Deduct the money. 
  await dbRun(
    'UPDATE player SET money = money - $1 WHERE id = $2',
    [totalBuildCost, playerId],
    'Failed to deduct money from player'
  );

  await dbRun(
    `INSERT INTO purchase_orders (player_id, start_time, duration, active, quantity, product_id) 
    VALUES 
    ($1, NOW(), $2, true, $3, $4)`,
    [playerId, building_duration, quantity, activeProduct.id],
    'Failed to start product build'
  );

  console.log('Product build started successfully');
  return { 
    message: 'Product build started successfully.',
    building_duration,
    building_steps,
    costToBuild: activeProduct.cost_to_build,
    quantity,
    totalCost: activeProduct.cost_to_build * quantity
  };
};

const ProductCompleted = async (purchaseOrderId, playerId) => {
  const purchaseOrder = await dbGet(
    'SELECT * FROM purchase_orders WHERE id = $1',
    [purchaseOrderId],
    'Failed to retrieve purchase order'
  );

  console.log('Product build completed for purchaseOrderId:', purchaseOrderId);
  console.log('productId:', purchaseOrder.product_id);
  await dbRun(
    'UPDATE inventory SET on_hand = on_hand + $1 WHERE player_id = $2 AND product_id = $3',
    [purchaseOrder.quantity, playerId, purchaseOrder.product_id],
    'Failed to update inventory'
  );

  await dbRun(
    'UPDATE purchase_orders SET active = false WHERE id = $1',
    [purchaseOrderId],
    'Failed to update purchase order status'
  );

  console.log('Product build completed successfully.');
};

const productTick = async (playerId) => {
  const activeProducts = await dbAll(
    `SELECT *, 
            EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time 
     FROM purchase_orders 
     WHERE player_id = $1 AND active = true`,
    [playerId],
    'Failed to retrieve active purchase orders'
  );

  for (const product of activeProducts) {
    const elapsedTime = product.elapsed_time;

    if (elapsedTime >= product.duration || product.start_time === null) {
      await ProductCompleted(product.id, playerId);
    }
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