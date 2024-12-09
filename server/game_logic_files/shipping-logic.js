const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');

const { XP_GAINED_PER_OPERATION, BASE_ORDER_DUE_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE, 
  GAME_SHIPPING_COST_PER_MILE, GAME_MIN_SHIPPING_DISTANCE, GAME_MAX_SHIPPING_DISTANCE, 
  OrderStates } = require('../constants');

const { playerHasTechnology } = require('./technology-logic');
const { getInventoryInfo, getActiveProduct } = require('./product-logic');
const { gainXP, getPlayerInfo } = require('./player-logic');

const DEFAULT_SHIPPING_STEPS = [
  {
    "step_code": "fill_ship_to",
    "name": "Filling Out Ship To Fields"
  },
  {
    "step_code": "input_weights_dimensions",
    "name": "Inputting Weights & Dimension"
  },
  {
    "step_code": "select_carrier",
    "name": "Selecting a Carrier"
  },
  {
    "step_code": "rate_shopping",
    "name": "Rate Shopping Services"
  },
  {
    "step_code": "adjust_insurance_confirmation",
    "name": "Packing the box(s)"
  },
  {
    "step_code": "print_label",
    "name": "Printing a Label"
  }
];

const OrderTick = async (player, product, inventory, elapsed_time, active_order) => {

  // console.log('order_shipped:', player.orders_shipped, 'products_built:', player.products_built);
  if(player.orders_shipped === 0 && player.products_built === 0) {
    // Player has not done anything yet, don't start generating orders. 
    // console.log('OrderTick - Player has not done anything yet, not generating orders');
    return { orders: [], secondsUntilNextOrder: 0, ordersShipped: 0 };
  }

  const orders = await getOrderList(
    'player_id = $1 AND active = true',
    [player.id]
  );

  // First, check on our active orders. 
  for (const order of orders) {
    await CheckOrderState(order, player, product);
  }

  let ordersShipped = await GenerateOrders(player, product, inventory, elapsed_time, orders);

  // TODO: use getOrder() for this. 
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
  
  // This is where we manifest incoming orders. 
  if(readyForNewOrder && orders.length < MAXIMUM_ORDER_QUEUE_SIZE) {
    ordersShipped += await _GenerateOrder(player.id);
  }

  if (ordersShipped > 0) {
    await gainXP(player, ordersShipped * XP_GAINED_PER_OPERATION);
  }

  // if automation is enabled and we're not shipping an order, attempt to ship one
  const hasHireWarehouseWorker = await playerHasTechnology(player.id, 'hire_warehouse_worker');
  // console.log('OrderTick - hasHireWarehouseWorker:', hasHireWarehouseWorker, 'active_order:', active_order);
  if (hasHireWarehouseWorker && !active_order) {
    // console.log('OrderTick - Player is not shipping and automated, so attempting to ship order');
    await shipOrder(player);
  }

  const oData = { orders, secondsUntilNextOrder, ordersShipped };
  return oData;
}

const CheckOrderState = async (order, player, product) => {
  if (!order) {
    return 0;
  }
  let ordersShipped = 0;
  if (order.state === OrderStates.InProgress && order.elapsed_time >= order.duration) {
    ordersShipped += await OrderCompleted(order.id, player);
  } else if (order.state !== OrderStates.InProgress && order.delta_to_due_date <= 0) {
    await OrderCanceled(order.id);
  }
  return ordersShipped;
}

const GenerateOrders = async (player, product, inventory, elapsed_time, orders) => {

  const spawnRateMs = Math.max(player.order_spawn_milliseconds, 10) || BASE_ORDER_SPAWN_MILLISECONDS;
  
  // We depend on steps * step_duration until its too fast, then we go with shipping_speed...
  const shipRateMs = player.shipping_duration;

  // console.log(`GenerateOrders - PlayerId: ${player.id}, SpawnRateMs: ${spawnRateMs}, ShipRateMs: ${shipRateMs}, ElapsedTime: ${elapsed_time}`);

  // log the number of orders we are spawning and shipping per second, note that our variables are in milliseconds
  const spawnsPerSecond = 1000 / spawnRateMs;
  const shipsPerSecond = 1000 / shipRateMs;
  // console.log(`GenerateOrders - SpawnsPerSecond: ${spawnsPerSecond}, ShipsPerSecond: ${shipsPerSecond}`);


  let orders_to_generate = Math.max(0, Math.floor(elapsed_time / spawnRateMs)) * player.order_spawn_count;

  // using elapsed_time, orders, and player.shipping_speed (milliseconds), calculate how many orders were shipped in this time period
  let new_orders_to_ship = Math.floor(elapsed_time / shipRateMs) * player.orders_per_ship;
  
  let ordersShipped = 0;

  // console.log('GenerateOrders - orders_to_generate:', orders_to_generate, 'new_orders_to_ship:', new_orders_to_ship, 'orders.length:', orders.length);
  ordersShipped = await _synthesizeShippedOrders(player, new_orders_to_ship, product, inventory, orders);

  // only generate orders we didn't already ship within this game tick, up to MAXIMUM_ORDER_QUEUE_SIZE
  orders_to_generate = Math.max(0, orders_to_generate - new_orders_to_ship);
  orders_to_generate = Math.min(orders_to_generate, MAXIMUM_ORDER_QUEUE_SIZE - orders.length);

  if(orders_to_generate > 0) {
    for (let i = 0; i < orders_to_generate; i++) {
      const order = await _GenerateOrder(player.id);
    }
  }

  // if( orders_to_generate > 0 || new_orders_to_ship > 0) {
  //   console.log(`GenerateOrders - OrdersShippable: ${new_orders_to_ship}, Generated: ${orders_to_generate}, Existing: ${orders.length}`);
  // }
  return ordersShipped;
}

const _synthesizeShippedOrders = async (player, new_orders_to_ship, product, inventory, orders) => {
  if(new_orders_to_ship <= 0) {
    return 0;
  }
  const hasHireWarehouseWorker = await playerHasTechnology(player.id, 'hire_warehouse_worker');
  if (!hasHireWarehouseWorker) {
    return 0;
  }
  
  let totalRevenue = 0;
  let totalOrdersShipped = 0;
  let available_stock = inventory[0].on_hand;
  let total_stock_to_deduct = 0;

  // First, try to ship any existing orders that are awaiting shipment
  let existing_orders_shipped = 0;
  const existing_orders_to_mark_shipped = Math.min(Math.min(orders.length, new_orders_to_ship),available_stock);
  for (let i = 0; i < existing_orders_to_mark_shipped; i++) {
    existing_orders_shipped += await OrderCompleted(orders[i].id, player);
    // money and stock for this order are handled in OrderCompleted. 
  }

  // OrderCompleted handles money and stock, but we need to track here...
  available_stock -= existing_orders_shipped * player.products_per_order;
  new_orders_to_ship -= existing_orders_shipped;

  // console.log(`_synthesizeShippedOrders - ExistingOrdersShipped: ${existing_orders_shipped}, NewOrdersToShip: ${new_orders_to_ship}`);

  const hasBundleTech = await playerHasTechnology(player.id, 'bundles');

  // loop through new_orders_to_ship and synthesize the orders
  for (let i = 0; i < new_orders_to_ship; i++) {
    if(available_stock >= player.products_per_order) {
      available_stock -= player.products_per_order;
      total_stock_to_deduct += player.products_per_order;
      totalOrdersShipped += player.products_per_order;
      const shippingCostPerMile = 0.05; // Cost per mile
      const distance = await calculateDistance();

      const sales_price = product.sales_price * (hasBundleTech ? hasBundleTech : 1);
      const revenue = (sales_price - product.cost_to_build - (distance * shippingCostPerMile) * player.products_per_order);
      // if(i == 0) {
      //   console.log(`_synthesizeShippedOrders - Distance: ${distance}, Revenue: ${revenue}, SalesPrice: ${product.sales_price}`);
      // }
      totalRevenue += revenue;
    } else {
      break;
    }
  }
  totalRevenue = Math.round(totalRevenue);
  // console.log(`totalRevenue: ${totalRevenue}, totalOrdersShipped: ${totalOrdersShipped}, total_stock_to_deduct: ${total_stock_to_deduct}`);
  if(totalOrdersShipped > 0) {
    // update player orders_shipped and total_money_earned and money 
    const playerRow = await dbRun(
      `UPDATE player 
        SET 
          orders_shipped = orders_shipped + $1, 
          total_money_earned = total_money_earned + $2, 
          money = money + $2 
        WHERE id = $3
        RETURNING orders_shipped, total_money_earned, money`,
      [totalOrdersShipped, totalRevenue, player.id],
      'Failed to update player orders_shipped, total_money_earned, and money'
    );

    // update inventory counts
    const invRow = await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 RETURNING on_hand',
      [total_stock_to_deduct, player.id],
      'Failed to update inventory on_hand'
    );
  }
  // console.log(`_synthesizeShippedOrders - OrdersToShip: ${new_orders_to_ship}, TotalRevenue: ${totalRevenue}, TotalStockToDeduct: ${total_stock_to_deduct}, OrdersShipped: ${totalOrdersShipped}`);
  return totalOrdersShipped;
}

const calculateDistance = async (playerId) => {
  const hasMultiWarehouseTech = await playerHasTechnology(playerId, 'multi_warehouse');
  // let shippingDistance = Math.round(Math.random() * (GAME_MAX_SHIPPING_DISTANCE - GAME_MIN_SHIPPING_DISTANCE) + GAME_MIN_SHIPPING_DISTANCE);
  let shippingDistance = 300;
  if (hasMultiWarehouseTech) {
    // Probably halves it...
    shippingDistance = Math.round(shippingDistance * hasMultiWarehouseTech);
  }
  return shippingDistance;
}

const _GenerateOrder = async (playerId) => {
  const player = await getPlayerInfo(playerId);

  // TODO: maybe shouldn't be random? 
  const distance = await calculateDistance();

  const due_by_time_seconds = BASE_ORDER_DUE_SECONDS;

  // log eerything important in one line
  // console.log(`_GenerateOrder - PlayerId: ${playerId}, Distance: ${distance}, DueByTimeSeconds: ${due_by_time_seconds}, State: ${state}`);

  const order = await dbGet(
    `INSERT INTO orders (player_id, due_by_time, state, distance, product_quantity) 
      VALUES 
      ($1, NOW() + INTERVAL '1 second' * $2, $3, $4, $5)
      RETURNING *`,
    [playerId, due_by_time_seconds, OrderStates.AwaitingShipment, distance, player.products_per_order],
    'Failed to generate order'
  );
  return order;
};

// The player has requested to ship an order
const shipOrder = async (player) => {
  
  let activeOrder = await getActiveOrder(player.id);
  const shippedOrders = await CheckOrderState(activeOrder, player);
  // console.log('shipOrder - activeOrder:', activeOrder, 'shippedOrders:', shippedOrders);
  if (activeOrder && shippedOrders === 0) {
    // An order is already being shipped AND has not finished. 
    return { error: 'An active order is still in progress' };

  } else {
    const hasOrderGridFilters = await playerHasTechnology(player.id, 'order_grid_filters');
    if (hasOrderGridFilters) {
      activeOrder = await getOrder(
        'active=true AND player_id = $1 AND state = $2 ORDER BY due_by_time ASC',
        [player.id, OrderStates.AwaitingShipment]
      );
    } else {
      activeOrder = await getOrder(
        'active=true AND player_id = $1 AND state = $2',
        [player.id, OrderStates.AwaitingShipment]
      );
    }
  }

  if (!activeOrder) {
    return { error: 'No orders available for shipping' };
  }

  const inventory = await getInventoryInfo(player.id);

  // If the player has inventory management tech, prevent overselling / bad effetcts. 
  let hasEnoughInventory = inventory[0].on_hand >= player.products_per_order;
  if (!hasEnoughInventory) {
    // const hasInventoryManagementTech = await playerHasTechnology(playerId, 'inventory_management');
    // if (!hasInventoryManagementTech) {
      
    // }
    console.log('ShipOrder - Player does not have enough inventory to fulfill this order');
    return { error: 'Not enough inventory!' };
  }

  // const { shipping_steps, total_duration } = await getShippingSteps(player);
  const total_duration = Math.round(player.shipping_steps.length * player.shipping_speed);
  const shippingData = await calculateShippingAndBuyLabel(player, activeOrder.distance);

  const total_products_shipped = Math.min(inventory[0].on_hand, player.products_per_order * player.orders_per_ship);
  const total_shipping_cost = Math.round(shippingData.shipping_cost * total_products_shipped);

  // console.log('ShipOrder - total_products_shipped:', total_products_shipped, 'total_shipping_cost:', total_shipping_cost);

  await dbRun(
    `UPDATE orders 
      SET duration = $1, state = $2, start_time = NOW(), shipping_cost = $3, product_quantity = $4 
      WHERE id = $5`,
    [total_duration, OrderStates.InProgress, total_shipping_cost, 
      total_products_shipped, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  activeOrder = await getActiveOrder(player.id);

  // console.log('ShipOrder: deducting money from player');
  await dbRun(
    'UPDATE player SET money = money - $1, progress = 0 WHERE id = $2',
    [total_shipping_cost, player.id],
    'Failed to update shipping status'
  );

  return { 
    message: 'Shipping started successfully.',
    total_duration,
    shipping_steps: player.shipping_steps,
    shipping_cost: shippingData.shipping_cost,
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
  if(!order) {
    return null;
  }

  // if (order) {
  //   const { shipping_steps, total_duration } = await getShippingSteps(params[0]);
  //   order.shipping_steps = shipping_steps;
  //   order.total_duration = total_duration;
  // }
  order.progress = Math.min((order.elapsed_time / order.duration) * 100, 100);
  order.is_shipping = order.progress < 100 ? true : false;

  return order;
};

const getOrderList = async (whereClause, params) => {
  let orders = await dbAll(
    `SELECT *, 
      EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time,
      ROUND(EXTRACT(EPOCH FROM (due_by_time - NOW()))) AS delta_to_due_date
      FROM orders 
      WHERE ${whereClause}
      ORDER BY due_by_time ASC`,
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

const calculateShippingAndBuyLabel = async (player, distance) => {

  const playerId = player.id;
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
  //exclusive_logistics_penalty_applied
  if (player.exclusive_logistics_penalty_applied) {
    shipping_cost *= 1.5;
  }

  const total_cost = Math.round(shipping_cost + product.cost_to_build);

  const data = { shipping_cost, total_cost };
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
  let shipping_steps = DEFAULT_SHIPPING_STEPS;

  // const shipping_speed_seconds = player.shipping_speed / 1000;

  // if user has the smartFill technology then eliminate the input_weights_dimensions step
  const hasPresetTech = await playerHasTechnology(playerId, 'smartfill');
  if (hasPresetTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await playerHasTechnology(playerId, 'rate_shopper');
  if (hasRateshopperTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'rate_shopping');
  }

  // shipping_steps = shipping_steps.map(step => ({ ...step, duration: shipping_speed_seconds }));

  return shipping_steps; // Ensure return statement is always executed
};

const OrderCompleted = async (orderId, player) => {
  const playerId = player.id;
  const product = await getActiveProduct(player);
  const order = await getOrderById(orderId);
  const inventory = await getInventoryInfo(playerId);

  if(!product || !order || !inventory || inventory.length === 0) {
    console.error('OrderCompleted - Missing product, order, or inventory');
    console.log('Product:', product, 'Order:', order, 'Inventory:', inventory);
    return 0;
  }
  
  // log some useful info about this order in one line
  // console.log(`OrderCompleted - OrderId: ${orderId}, ProductId: ${product.id}, ProductQuantity: ${order.product_quantity}`);

  let orders_shipped = player.orders_per_ship;
  let revenue = Math.round(product.sales_price * order.product_quantity);
  let order_state = OrderStates.Shipped;
  const productQuantity = order.product_quantity;

  if (inventory[0].on_hand < (productQuantity)) {
    // player did not have inventory to fulfill this order! PUNISH THEM!
    // console.log('OrderCompleted - Player did not have enough inventory to fulfill this order. OrderId:', orderId);
    revenue = 0;
    orders_shipped = 0;
    order_state = OrderStates.Lost;
    orders_shipped = 0;
  } else {
    // console.log('OrderCompleted - Deducting stock. Quantity:', order.product_quantity);

    // Deduct stock from inventory
    await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 AND product_id = $3',
      [productQuantity, playerId, product.id],
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
  return orders_shipped;
};

const OrderCanceled = async (orderId) => {
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