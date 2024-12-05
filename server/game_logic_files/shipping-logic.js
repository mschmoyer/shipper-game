const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { XP_GAINED_PER_OPERATION, BASE_ORDER_DUE_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE, GAME_SHIPPING_COST_PER_MILE, GAME_MIN_SHIPPING_DISTANCE, GAME_MAX_SHIPPING_DISTANCE, OrderStates } = require('../constants');
const { playerHasTechnology } = require('./technology-logic');
const { getInventoryInfo, getActiveProduct } = require('./product-logic');
const { gainXP, getPlayerInfo } = require('./player-logic');

const OrderTick = async (player, product, inventory, elapsed_time) => {

  const orders = await getOrderList(
    'player_id = $1 AND active = true',
    [player.id]
  );

  let ordersShipped = await GenerateOrders(player, product, inventory, elapsed_time, orders.length);

  for (const order of orders) {
    if (order.state === OrderStates.InProgress && order.elapsed_time >= order.duration) {
      ordersShipped += await OrderCompleted(order.id, player.id);
    } else if (order.state !== OrderStates.InProgress && order.delta_to_due_date <= 0) {
      await OrderCanceled(order.id, player.id);
    }
  }

  const lastOrder = await dbGet(
    `SELECT *,
      EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since_creation
      FROM orders 
      WHERE player_id = $1 ORDER BY id DESC LIMIT 1`,
    [player.id],
    'Failed to retrieve last order'
  );
  const spawnTime = (player.order_spawn_milliseconds || BASE_ORDER_SPAWN_MILLISECONDS) / 1000;
  const readyForNewOrder = (!lastOrder || lastOrder.seconds_since_creation >= spawnTime);
  const secondsUntilNextOrder = Math.round(readyForNewOrder ? 0 : Math.max(0, spawnTime - lastOrder.seconds_since_creation));
  
  if(readyForNewOrder && orders.length < MAXIMUM_ORDER_QUEUE_SIZE) {
    await _GenerateOrder(player.id);
  }

  if (ordersShipped > 0) {
    await gainXP(player, ordersShipped * XP_GAINED_PER_OPERATION);
  }

  return { orders, secondsUntilNextOrder, ordersShipped };
}

const GenerateOrders = async (player, product, inventory, elapsed_time, existing_order_count) => {

  // using elapsed_time and player.order_spawn_milliseconds, calculate the number of orders to generate and generate them
  let order_spawn_milliseconds = Math.max(player.order_spawn_milliseconds, 10) || BASE_ORDER_SPAWN_MILLISECONDS;
  const shipping_speed = Math.max(player.shipping_speed, 100);
  let order_ship_milliseconds = (player.shipping_speed < 1000 ? shipping_speed : (player.shipping_duration));

  // console.log('GenerateOrders - OrderSpawnMilliseconds:', order_spawn_milliseconds, 'order_ship_ms:', order_ship_milliseconds);

  let orders_to_generate = Math.max(0, Math.floor(elapsed_time / order_spawn_milliseconds)) * player.order_spawn_count;

  // using elapsed_time, orders, and player.shipping_speed (milliseconds), calculate how many orders were shipped in this time period
  let new_orders_to_ship = Math.max(10, Math.floor(elapsed_time / order_ship_milliseconds)) * player.orders_per_ship;
  let ordersShipped = 0;

  // check if player has technology hire_warehouse_worker
  const hasHireWarehouseWorker = await playerHasTechnology(player.id, 'hire_warehouse_worker');
  if(!hasHireWarehouseWorker) {
    new_orders_to_ship = 0;
  }

  // console.log('GenerateOrders - OrdersToGenerate:', orders_to_generate, 'OrdersToShip:', new_orders_to_ship, 'ExistingOrders:', existing_order_count);

  if(new_orders_to_ship > 0) {
    ordersShipped = await _synthesizeShippedOrders(player, new_orders_to_ship, product, inventory);
  }

  // only generate orders we didn't already ship within this game tick, up to MAXIMUM_ORDER_QUEUE_SIZE
  orders_to_generate = Math.max(0, orders_to_generate - new_orders_to_ship);
  orders_to_generate = Math.min(orders_to_generate, MAXIMUM_ORDER_QUEUE_SIZE - existing_order_count);

  // generate orders_to_generate number of orders but don't exceed MAXIMUM_ORDER_QUEUE_SIZE using existing_order_count
  const orders = [];
  if(orders_to_generate > 0) {
    for (let i = 0; i < orders_to_generate; i++) {
      const order = await _GenerateOrder(player.id);
      orders.push(order);
    }
  }

  // if( orders_to_generate > 0 || new_orders_to_ship > 0) {
    // log new_orders_to_ship and orders_to_generate and existing_order_count in one line
    // console.log(`GenerateOrders - OrdersShippable: ${new_orders_to_ship}, Generated: ${orders_to_generate}, Existing: ${existing_order_count}`);
  // }

  return ordersShipped;
}

const calculateDistance = () => {
  return Math.round(Math.random() * (GAME_MAX_SHIPPING_DISTANCE - GAME_MIN_SHIPPING_DISTANCE) + GAME_MIN_SHIPPING_DISTANCE);
}

const _synthesizeShippedOrders = async (player, new_orders_to_ship, product, inventory) => {
  if(new_orders_to_ship <= 0) {
    return;
  }

  let totalRevenue = 0;
  let totalOrdersShipped = 0;
  let available_stock = inventory[0].on_hand;
  let total_stock_to_deduct = 0;
  const shippingData = await calculateShippingAndBuyLabel(player.id, 100);

  // loop through new_orders_to_ship and synthesize the orders
  for (let i = 0; i < new_orders_to_ship; i++) {
    if(available_stock >= player.products_per_order) {
      available_stock -= player.products_per_order;
      total_stock_to_deduct += player.products_per_order;
      totalOrdersShipped++;
      const shippingCostPerMile = 0.05; // Cost per mile
      const distance = calculateDistance();
      const revenue = shippingData.sales_price - shippingData.cost_to_build - (distance * shippingCostPerMile);
      if(i == 0) {
        console.log(`_synthesizeShippedOrders - Distance: ${distance}, Revenue: ${revenue}, SalesPrice: ${shippingData.sales_price}, CostToBuild: ${shippingData.cost_to_build}`);
      }
      totalRevenue += revenue;
    } else {
      break;
    }
  }

  if(totalOrdersShipped <= 0) {
    // update player orders_shipped and total_money_earned and money 
    const playerRow = await dbRun(
      `UPDATE player 
        SET orders_shipped = orders_shipped + $1, total_money_earned = total_money_earned + $2, money = money + $2 
        WHERE id = $3
        RETURNING orders_shipped, total_money_earned, money`,
      [totalOrdersShipped, Math.round(totalRevenue), player.id],
      'Failed to update player orders_shipped, total_money_earned, and money'
    );

    // update inventory counts
    const invRow = await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 RETURNING on_hand',
      [total_stock_to_deduct, player.id],
      'Failed to update inventory on_hand'
    );

    console.log(`_synthesizeShippedOrders - OrdersToShip: ${new_orders_to_ship}, TotalRevenue: ${totalRevenue}, TotalStockToDeduct: ${total_stock_to_deduct}, OrdersShipped: ${totalOrdersShipped}, Money: ${playerRow.rows[0].money}, on_hand: ${invRow.rows[0].on_hand}`);
  }
  return totalOrdersShipped;
}

const _GenerateOrder = async (playerId, state = OrderStates.AwaitingShipment) => {
  const player = await getPlayerInfo(playerId);

  // TODO: maybe shouldn't be random? 
  const distance = calculateDistance();

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
  const shippingData = await calculateShippingAndBuyLabel(playerId, activeOrder.distance);

  const shipping_speed = Math.max(player.shipping_speed, 100);
  let order_ship_milliseconds = (player.shipping_speed < 1000 ? shipping_speed : (player.shipping_duration));

  await dbRun(
    'UPDATE orders SET duration = $1, state = $2, start_time = NOW(), shipping_cost = $3, product_quantity = $4 WHERE id = $5',
    [total_duration, OrderStates.InProgress, Math.round(shippingData.shipping_cost), player.products_per_order, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  activeOrder = await getActiveOrder(playerId);

  await dbRun(
    'UPDATE player SET money = money - $1, is_shipping = true, progress = 0 WHERE id = $2',
    [shippingData.total_cost, playerId],
    'Failed to update shipping status'
  );

  if(order_ship_milliseconds < 1000) {
    OrderCompleted(activeOrder.id, playerId);
  }

  return { 
    message: 'Shipping started successfully.',
    total_duration,
    shipping_steps,
    shipping_cost: shippingData.shipping_cost,
    sales_price: shippingData.sales_price,
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

  const product = await dbGet(
    'SELECT p.weight, p.cost_to_build, p.sales_price FROM products p JOIN player_products pp ON p.id = pp.product_id WHERE pp.player_id = $1',
    [playerId],
    'Failed to retrieve product info'
  );

  const shippingCostPerMile = GAME_SHIPPING_COST_PER_MILE;
  let shipping_cost = distance * shippingCostPerMile;

  const discountedShippingModifier = await playerHasTechnology(playerId, 'discounted_shipping_rates');
  if (discountedShippingModifier) {
    shipping_cost *= (1 - discountedShippingModifier);
  }

  const total_cost = Math.round(shipping_cost + product.cost_to_build);

  const data = { shipping_cost, sales_price: product.sales_price, cost_to_build: product.cost_to_build, total_cost };
  return data;
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

  // log revenue, orders_shipped, and order_state
  // console.log(`OrderCompleted - Revenue: ${revenue}, OrdersShipped: ${orders_shipped}, OrderState: ${order_state}`);
  return 1;
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
  OrderTick,
  calculateShippingAndBuyLabel,
  getShippingSteps,
  OrderCompleted,
  OrderCanceled,
  GenerateOrders,
  shipOrder,
  getActiveOrder,
  getOrder,
  getOrderList // Export the new function
};