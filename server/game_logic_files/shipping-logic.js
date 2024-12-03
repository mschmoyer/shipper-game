const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { OrderStates, BASE_PRODUCTS_PER_ORDER } = require('../constants');
const { playerHasTechnology } = require('./technology-logic');
const { getInventoryInfo, getActiveProduct } = require('./product-logic');
const { getPlayerInfo } = require('./player-logic');

const shipOrder = async (playerId) => {

  let activeOrder = await dbGet(
    `SELECT * FROM orders 
      WHERE active=true and playerId = ? 
      AND state = ?`,
    [playerId, OrderStates.InProgress],
    'Failed to check active orders'
  );

  if (activeOrder) {
    return { error: 'An active order is still in progress' };
  } else {
    const hasOrderGridFilters = await playerHasTechnology(playerId, 'order_grid_filters');
    if (hasOrderGridFilters) {
      activeOrder = await dbGet(
      `SELECT * FROM orders 
      WHERE active=true and playerId = ? 
      AND state = ?
      ORDER BY dueByTime ASC
      LIMIT 1`,
      [playerId, OrderStates.AwaitingShipment],
      'Failed to check active orders'
      );
    } else {
      activeOrder = await dbGet(
      `SELECT * FROM orders 
      WHERE active=true and playerId = ? 
      AND state = ?
      ORDER BY RANDOM()
      LIMIT 1`,
      [playerId, OrderStates.AwaitingShipment],
      'Failed to check active orders'
      );
    }
  }

  if (!activeOrder) {
    return { error: 'No orders available for shipping' };
  }

  const inventory = await getInventoryInfo(playerId);
  const player = await getPlayerInfo(playerId);
  const productsPerOrder = player.productsPerOrder;

  if (inventory[0].onHand < productsPerOrder) {
    return { error: 'Not enough inventory to fulfill the order' };
  }

  const { steps: shippingSteps, totalDuration: baseShippingDuration } = await getShippingSteps(playerId);
  let shippingDuration = baseShippingDuration;

  const { shippingCost, salesPrice } = await calculateShippingAndBuyLabel(playerId, activeOrder.distance);

  await dbRun(
    'UPDATE orders SET duration = ?, state = ?, startTime = ?, shippingCost = ?, productQuantity = ? WHERE id = ?',
    [shippingDuration, OrderStates.InProgress, new Date().toISOString(), shippingCost, productsPerOrder, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  await dbRun(
    'UPDATE player SET isShipping = 1, progress = 0 WHERE id = ?',
    [playerId],
    'Failed to update shipping status'
  );

  return { 
    message: 'Shipping started successfully.',
    shippingDuration,
    shippingSteps,
    shippingCost,
    salesPrice,
    order: activeOrder
  };
};


const calculateShippingAndBuyLabel = async (playerId, distance) => {
  try {
    const product = await dbGet(
      'SELECT p.weight, p.costToBuild, p.salesPrice FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
      [playerId],
      'Failed to retrieve product info'
    );

    const shippingCostPerMile = 0.05; // Cost per mile
    let shippingCost = distance * shippingCostPerMile;

    const discountedShippingModifier = await playerHasTechnology(playerId, 'discounted_shipping_rates');
    if (discountedShippingModifier) {
      console.log('Applying discounted shipping modifier:', discountedShippingModifier);
      shippingCost *= (1 - discountedShippingModifier); // Reduce shipping cost by the modifier value
    }

    const totalCost = Math.round(shippingCost + product.costToBuild);

    await dbRun(
      'UPDATE player SET money = money - ? WHERE id = ?',
      [Math.round(totalCost), playerId],
      'Failed to deduct shipping and production costs'
    );

    return { shippingCost: Math.round(shippingCost), salesPrice: Math.round(product.salesPrice) };
  } catch (err) {
    throw new Error(err.message);
  }
};

// get order by orderId
const getOrderById = async (orderId) => {
  return await dbGet(
    'SELECT * FROM orders WHERE id = ?',
    [orderId],
    'Failed to retrieve order'
  );
}

const getShippingSteps = async (playerId) => {
  const stepsPath = path.join(__dirname, '../game_data_files/shipping-steps.json');
  let steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

  const player = await dbGet(
    'SELECT shippingSpeed FROM player WHERE id = ?',
    [playerId],
    'Failed to retrieve player shipping speed'
  );

  const shippingSpeed = player.shippingSpeed;

  // if user has the smartFill technology then eliminate the input_weights_dimensions step
  const hasPresetTech = await playerHasTechnology(playerId, 'smartfill');
  if (hasPresetTech) {
    steps = steps.filter(step => step.stepCode !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await playerHasTechnology(playerId, 'rate_shopper');
  if (hasRateshopperTech) {
    steps = steps.filter(step => step.stepCode !== 'rate_shopping');
  }

  steps = steps.map(step => ({ ...step, duration: shippingSpeed }));

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  return { steps, totalDuration }; // Ensure return statement is always executed
};

const OrderCompleted = async (orderId, playerId) => {
  try {
    const product = await getActiveProduct(playerId);
    const order = await getOrderById(orderId);
    console.log('Order completed:', order);

    const revenue = Math.round(product.salesPrice) * order.productQuantity;

    await dbRun(
      'UPDATE player SET money = money + ?, ordersShipped = ordersShipped + 1, totalMoneyEarned = totalMoneyEarned + ? WHERE id = ?',
      [revenue, revenue, playerId],
      'Failed to update money'
    );
    await dbRun(
      'UPDATE orders SET state = ?, active = 0 WHERE id = ?',
      [OrderStates.Shipped, orderId],
      'Failed to update order status'
    );

    console.log('Deducting stock - order.ProductQuantity:', order.productQuantity);

    // Deduct stock from inventory
    await dbRun(
      'UPDATE inventory SET onHand = onHand - ? WHERE playerId = ? AND productId = ?',
      [order.productQuantity, playerId, product.id],
      'Failed to deduct stock from inventory'
    );

    console.log('Order completed successfully. Revenue:', revenue);
  } catch (err) {
    throw new Error(err.message);
  }
};

const OrderCanceled = async (orderId, playerId) => {
  //console.log(`Order ${orderId} for player ${playerId} has been canceled.`);

  await dbRun(
    'UPDATE orders SET active=0, state = ? WHERE id = ?',
    [OrderStates.Canceled, orderId],
    'Failed to update order state to canceled'
  );
};

const GenerateOrder = async (playerId) => {
  const startTime = new Date().toISOString();
  const dueByTime = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now
  const duration = 120; // 2 minutes in seconds
  const state = OrderStates.AwaitingShipment; // Use OrderStates enum
  const distance = Math.round(Math.random() * 1000); // Random distance in miles

  try {
    await dbRun(
      'INSERT INTO orders (playerId, startTime, duration, dueByTime, state, distance) VALUES (?, ?, ?, ?, ?, ?)',
      [playerId, startTime, duration, dueByTime, state, distance],
      'Failed to generate order'
    );

    const order = await dbGet(
      'SELECT * FROM orders WHERE playerId = ? ORDER BY id DESC LIMIT 1',
      [playerId],
      'Failed to retrieve generated order'
    );

    return order;
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = {
  calculateShippingAndBuyLabel,
  getShippingSteps,
  OrderCompleted,
  OrderCanceled,
  GenerateOrder,
  shipOrder // Export the new function
};