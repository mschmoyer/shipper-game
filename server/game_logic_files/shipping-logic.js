const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { BASE_ORDER_DUE_SECONDS, OrderStates } = require('../constants');
const { playerHasTechnology } = require('./technology-logic');
const { getInventoryInfo, getActiveProduct } = require('./product-logic');
const { addSkillPoints, getPlayerInfo } = require('./player-logic');
const { increaseShippingSpeed } = require('./player-logic');

const GenerateOrder = async (playerId) => {
  const player = await getPlayerInfo(playerId);
  const state = OrderStates.AwaitingShipment;
  const distance = Math.round(Math.random() * 1000); // Random distance in miles
  const due_by_time_seconds = BASE_ORDER_DUE_SECONDS;

  const order = await dbGet(
    `INSERT INTO orders (player_id, due_by_time, state, distance, product_quantity) 
      VALUES 
      ($1, NOW() + INTERVAL '1 second' * $2, $3, $4, $5)
      RETURNING *`,
    [playerId, due_by_time_seconds, state, distance, player.products_per_order],
    'Failed to generate order'
  );
  return order;
};

// The player has requested to ship an order
const shipOrder = async (playerId) => {
  let activeOrder = await getActiveOrder(playerId);

  if (activeOrder) {
    return { error: 'An active order is still in progress' };
  } else {
    const hasOrderGridFilters = await playerHasTechnology(playerId, 'order_grid_filters');
    if (hasOrderGridFilters) {
      activeOrder = await getOrder(
        'active=true AND player_id = $1 AND state = $2 ORDER BY due_by_time ASC',
        [playerId, OrderStates.AwaitingShipment]
      );
    } else {
      activeOrder = await getOrder(
        'active=true AND player_id = $1 AND state = $2',
        [playerId, OrderStates.AwaitingShipment]
      );
    }
  }

  if (!activeOrder) {
    return { error: 'No orders available for shipping' };
  }

  const inventory = await getInventoryInfo(playerId);

  const player = await getPlayerInfo(playerId);

  // If the player has inventory management tech, prevent overselling / bad effetcts. 
  if (inventory[0].on_hand < player.products_per_order) {
    const hasInventoryManagementTech = await playerHasTechnology(playerId, 'inventory_management');
    if (!hasInventoryManagementTech) {
      return { error: 'Not enough inventory!' };
    }
  }

  const { shipping_steps, total_duration } = await getShippingSteps(playerId);

  const { shipping_cost, sales_price } = await calculateShippingAndBuyLabel(playerId, activeOrder.distance);

  await dbRun(
    'UPDATE orders SET duration = $1, state = $2, start_time = NOW(), shipping_cost = $3, product_quantity = $4 WHERE id = $5',
    [total_duration, OrderStates.InProgress, shipping_cost, player.products_per_order, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  activeOrder = await getActiveOrder(playerId);

  await dbRun(
    'UPDATE player SET is_shipping = true, progress = 0 WHERE id = $1',
    [playerId],
    'Failed to update shipping status'
  );

  return { 
    message: 'Shipping started successfully.',
    total_duration,
    shipping_steps,
    shipping_cost,
    sales_price,
    order: activeOrder
  };
};

const getOrder = async (whereClause, params) => {
  let order = await dbGet(
    `SELECT *, 
      EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time,
      ROUND(EXTRACT(EPOCH FROM ((due_by_time + interval '1 second' * duration) - NOW()))) AS delta_to_due_date
      FROM orders 
      WHERE ${whereClause} 
      LIMIT 1`,
    params,
    'Failed to retrieve order'
  );

  if (order) {
    const { shipping_steps, total_duration } = await getShippingSteps(params[0]);
    order.shipping_steps = shipping_steps;
    order.total_duration = total_duration;
  }

  return order;
};

const getOrderList = async (whereClause, params) => {
  let orders = await dbAll(
    `SELECT *, 
      EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time,
      ROUND(EXTRACT(EPOCH FROM (due_by_time - NOW()))) AS delta_to_due_date
      FROM orders 
      WHERE ${whereClause}`,
    params,
    'Failed to retrieve orders'
  );

  for (let order of orders) {
    const { shipping_steps, total_duration } = await getShippingSteps(params[0]);
    //order.shipping_steps = shipping_steps;
    order.total_duration = total_duration;
  }

  return orders;
};

const getActiveOrder = async (playerId) => {
  return await getOrder(
    'player_id = $1 AND active = true AND state = $2',
    [playerId, OrderStates.InProgress]
  );
};

const calculateShippingAndBuyLabel = async (playerId, distance) => {
  try {
    const product = await dbGet(
      'SELECT p.weight, p.cost_to_build, p.sales_price FROM products p JOIN player_products pp ON p.id = pp.product_id WHERE pp.player_id = $1',
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

    const totalCost = Math.round(shippingCost + product.cost_to_build);

    await dbRun(
      'UPDATE player SET money = money - $1 WHERE id = $2',
      [Math.round(totalCost), playerId],
      'Failed to deduct shipping and production costs'
    );

    return { shipping_cost: Math.round(shippingCost), sales_price: Math.round(product.sales_price) };
  } catch (err) {
    throw new Error(err.message);
  }
};

// get order by orderId
const getOrderById = async (orderId) => {
  return await dbGet(
    'SELECT * FROM orders WHERE id = $1',
    [orderId],
    'Failed to retrieve order'
  );
};

const getShippingSteps = async (playerId) => {
  const stepsPath = path.join(__dirname, '../game_data_files/shipping-steps.json');
  let shipping_steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

  const player = await dbGet(
    'SELECT shipping_speed FROM player WHERE id = $1',
    [playerId],
    'Failed to retrieve player shipping speed'
  );

  const shipping_speed_seconds = player.shipping_speed / 1000;

  // if user has the smartFill technology then eliminate the input_weights_dimensions step
  const hasPresetTech = await playerHasTechnology(playerId, 'smartfill');
  if (hasPresetTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await playerHasTechnology(playerId, 'rate_shopper');
  if (hasRateshopperTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'rate_shopping');
  }

  shipping_steps = shipping_steps.map(step => ({ ...step, duration: shipping_speed_seconds }));

  const total_duration = Math.round((shipping_steps.length * shipping_speed_seconds) * 1000);
  return { shipping_steps, total_duration }; // Ensure return statement is always executed
};

const OrderCompleted = async (orderId, playerId) => {
  const product = await getActiveProduct(playerId);
  const order = await getOrderById(orderId);
  const inventory = await getInventoryInfo(playerId);
  
  // log some useful info about this order in one line
  // console.log(`OrderCompleted - OrderId: ${orderId}, ProductId: ${product.id}, ProductQuantity: ${order.product_quantity}`);

  let revenue = Math.round(product.sales_price) * order.product_quantity;
  let orders_shipped = 1; 
  let order_state = OrderStates.Shipped;

  if (inventory[0].on_hand < order.product_quantity) {
    // player did not have inventory to fulfill this order! PUNISH THEM!
    // console.log('OrderCompleted - Player did not have enough inventory to fulfill this order. OrderId:', orderId);
    revenue = 0;
    orders_shipped = 0;
    order_state = OrderStates.Lost;
  } else {
    // console.log('OrderCompleted - Deducting stock. Quantity:', order.product_quantity);

    // Deduct stock from inventory
    await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 AND product_id = $3',
      [order.product_quantity, playerId, product.id],
      'Failed to deduct stock from inventory'
    );
  }

  // Player earns revenue for this order and orders_shipped increases
  await dbRun(
    'UPDATE player SET money = money + $1, orders_shipped = orders_shipped + $2, total_money_earned = total_money_earned + $3 WHERE id = $4',
    [revenue, orders_shipped, revenue, playerId],
    'Failed to update money'
  );

  // Update order state to shipped and deactivate it
  await dbRun(
    'UPDATE orders SET state = $1, active = false WHERE id = $2',
    [order_state, orderId],
    'Failed to update order status'
  );

  // do this one out of 10 times
  const random = Math.floor(Math.random() * 10);
  if (random === 0) {
    await addSkillPoints(playerId, 1);
  }

  // log revenue, orders_shipped, and order_state
  // console.log(`OrderCompleted - Revenue: ${revenue}, OrdersShipped: ${orders_shipped}, OrderState: ${order_state}`);
};

const OrderCanceled = async (orderId, playerId) => {
  // console.log(`Order ${orderId} for player ${playerId} has been canceled.`);
  await dbRun(
    'UPDATE orders SET active=false, state = $1 WHERE id = $2',
    [OrderStates.Canceled, orderId],
    'Failed to update order state to canceled'
  );
};

module.exports = {
  calculateShippingAndBuyLabel,
  getShippingSteps,
  OrderCompleted,
  OrderCanceled,
  GenerateOrder,
  shipOrder,
  getActiveOrder,
  getOrder,
  getOrderList // Export the new function
};