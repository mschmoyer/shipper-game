const { dbRun, dbGet, dbAll } = require('../database');

const { XP_GAINED_PER_OPERATION, BASE_ORDER_DUE_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE, 
  GAME_SHIPPING_COST_PER_MILE, OrderStates } = require('../constants');

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

  if(player.orders_shipped === 0 && player.products_built === 0) {
    return { orders: [], secondsUntilNextOrder: 0, ordersShipped: 0 };
  }
  const orders = await getOrderList(
    'player_id = $1 AND active = true',
    [player.id]
  );
  for (const order of orders) {
    await CheckOrderState(order, player, product);
  }

  let ordersShipped = await GenerateOrders(player, product, inventory, elapsed_time, orders);

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
  
  if(ordersShipped <= 0 && readyForNewOrder && orders.length < MAXIMUM_ORDER_QUEUE_SIZE) {
    ordersShipped += await _GenerateOrder(player.id);
    if( await isAdvertisingCampaignActive(player) ) {
      ordersShipped += await _GenerateOrder(player.id);
    }
  }

  if (ordersShipped > 0) {
    await gainXP(player, ordersShipped * XP_GAINED_PER_OPERATION);
  }

  const hasHireWarehouseWorker = await playerHasTechnology(player.id, 'hire_warehouse_worker');
  if (hasHireWarehouseWorker && (!active_order && ordersShipped < 2)) {
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

const isAdvertisingCampaignActive = async (player) => {
  const hasAdvertisingTech = await playerHasTechnology(player.id, 'advertising_campaign');
  if (hasAdvertisingTech && player.advertising_campaign_start_time) {
    const hasExpired = new Date() - player.advertising_campaign_start_time > 120000;
    if(hasExpired) {
      await dbRun(
        'UPDATE player SET advertising_campaign_start_time = NULL WHERE id = $1',
        [player.id],
        'Failed to cancel advertising campaign'
      );
      await dbRun(
        'DELETE FROM acquired_technologies WHERE player_id = $1 AND tech_code = $2',
        [player.id, 'advertising_campaign'],
        'Failed to remove advertising campaign from acquired technologies'
      );
      return false;
    }
    return true;
  }
  return false;
}

const GenerateOrders = async (player, product, inventory, elapsed_time, orders) => {

  const spawnRateMs = Math.max(player.order_spawn_milliseconds, 10) || BASE_ORDER_SPAWN_MILLISECONDS;
  const shipRateMs = player.shipping_duration;

  let orders_to_generate = (elapsed_time / spawnRateMs) * player.order_spawn_count;
  if( await isAdvertisingCampaignActive(player) ) {
    orders_to_generate *= 2;
  } 
  let orders_shippable = (elapsed_time / shipRateMs) * player.orders_per_ship;
  let ordersShipped = 0;
  // We can only ship as many orders as we have in the queue
  orders_shippable = Math.min(orders_shippable, orders_to_generate + orders.length);
  let orders_to_ship = Math.min(orders_shippable, orders_to_generate);
  console.log('orders_to_generate:', orders_to_generate, 'orders_shippable', orders_shippable, 'orders_to_ship:', orders_to_ship);
  ordersShipped = await _synthesizeShippedOrders(player, orders_to_ship, product, inventory, orders);

  orders_shippable -= ordersShipped;
  let available_stock = inventory[0].on_hand - ordersShipped;
  const existing_orders_to_mark_shipped = Math.floor(Math.min(Math.min(orders.length, orders_shippable),available_stock));
  
  // log orders_shippable, ordersShipped, existing_orders_to_mark_shipped
  console.log('GenerateOrders: orders_shippable, ordersShipped, existing_orders_to_mark_shipped', 
    orders_shippable, ordersShipped, existing_orders_to_mark_shipped);

  for (let i = 0; i < existing_orders_to_mark_shipped; i++) {
    let orders_completed = await OrderCompleted(orders[i].id, player);
    available_stock -= orders_completed * player.products_per_order;
    orders_shippable -= orders_completed;
    ordersShipped += orders_completed;
  }

  orders_to_generate = Math.max(0, orders_to_generate - ordersShipped);
  orders_to_generate = Math.min(orders_to_generate, MAXIMUM_ORDER_QUEUE_SIZE - orders.length);
  if(orders_to_generate > 0) {
    for (let i = 0; i < orders_to_generate; i++) {
      await _GenerateOrder(player.id);
    }
  }

  // log for debugging, including elapsed_time, orders_to_generate, orders_shippable, ordersShipped
  console.log('GenerateOrders: elapsed_time, orders_to_generate, orders_shippable, ordersShipped', 
    elapsed_time, orders_to_generate, orders_shippable, ordersShipped);

  return ordersShipped;
}

const _synthesizeShippedOrders = async (player, orders_to_ship, product, inventory, orders) => {

  const hasHireWarehouseWorker = await playerHasTechnology(player.id, 'hire_warehouse_worker');
  if (!hasHireWarehouseWorker || orders_to_ship <= 0) {
    return 0;
  }  
  
  let totalRevenue = 0;
  let totalOrdersShipped = 0;
  let available_stock = inventory[0].on_hand;
  let total_stock_to_deduct = 0;

  // log orders.length, orders_to_ship, available_stock
  console.log('SynthesizeOrders 1: orders.length, orders_to_ship, available_stock', 
    orders.length, orders_to_ship, available_stock);

  const hasBundleTech = await playerHasTechnology(player.id, 'bundles');
  const shippingCostPerMile = await getShippingCostPerMile(player);
  const distance = await calculateDistance(player.id);
  const sales_price = product.sales_price * (hasBundleTech ? hasBundleTech : 1);
  const revenue = (sales_price - product.cost_to_build - (distance * shippingCostPerMile) * player.products_per_order);

  for (let i = 0; i < orders_to_ship; i++) {
    if(available_stock >= player.products_per_order) {
      available_stock -= player.products_per_order;
      total_stock_to_deduct += player.products_per_order;
      totalOrdersShipped += 1;
      totalRevenue += revenue;
    } else {
      break;
    }
  }
  orders_to_ship -= totalOrdersShipped;

  // console log the variables above in one line
  console.log('SynthesizeOrders 3: totalRevenue, totalOrdersShipped, total_stock_to_deduct, orders_to_ship, available_stock', 
    totalRevenue, totalOrdersShipped, total_stock_to_deduct, orders_to_ship, available_stock);

  totalRevenue = Math.round(totalRevenue);
  if(totalOrdersShipped > 0) {
    await dbRun(
      `UPDATE player 
        SET 
          orders_shipped = LEAST(orders_shipped + $1, 2147483647-1), 
          total_money_earned = LEAST(total_money_earned + $2, 2147483647-1),
          money = LEAST(money + $2, 2147483647-1)
        WHERE id = $3
        RETURNING orders_shipped, total_money_earned, money`,
      [totalOrdersShipped, totalRevenue, player.id],
      `Failed to update player orders_shipped, total_money_earned, and money for playerId: ${player.id}`
    );

    await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 RETURNING on_hand',
      [total_stock_to_deduct, player.id],
      'Failed to update inventory on_hand'
    );
  }

  return totalOrdersShipped;
}

const calculateDistance = async (playerId) => {
  const hasMultiWarehouseTech = await playerHasTechnology(playerId, 'multi_warehouse');
  let shippingDistance = 300;
  if (hasMultiWarehouseTech) {
    shippingDistance = shippingDistance / 2;
  }
  return shippingDistance;
}

const _GenerateOrder = async (playerId) => {
  const player = await getPlayerInfo(playerId);
  const distance = await calculateDistance(playerId);
  const due_by_time_seconds = BASE_ORDER_DUE_SECONDS;

  await dbGet(
    `INSERT INTO orders (player_id, due_by_time, state, distance, product_quantity) 
      VALUES 
      ($1, NOW() + INTERVAL '1 second' * $2, $3, $4, $5)
      RETURNING *`,
    [playerId, due_by_time_seconds, OrderStates.AwaitingShipment, distance, player.products_per_order],
    'Failed to generate order'
  );
  return 1;
};

const shipOrder = async (player) => {
  let activeOrder = await getActiveOrder(player.id);
  const shippedOrders = await CheckOrderState(activeOrder, player);
  if (activeOrder && shippedOrders === 0) {
    return { error: 'You are busy shipping.' };
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

  let hasEnoughInventory = inventory[0].on_hand >= player.products_per_order;
  if (!hasEnoughInventory) {
    return { error: 'Not enough inventory!' };
  }

  const total_duration = Math.round(player.shipping_duration);
  const shippingData = await calculateShippingAndBuyLabel(player, activeOrder.distance);
  const total_products_shipped = Math.min(inventory[0].on_hand, player.products_per_order * player.orders_per_ship);
  const total_shipping_cost = Math.round(shippingData.shipping_cost * total_products_shipped);

  await dbRun(
    `UPDATE orders 
      SET duration = $1, state = $2, start_time = NOW(), shipping_cost = $3, product_quantity = $4 
      WHERE id = $5`,
    [total_duration, OrderStates.InProgress, total_shipping_cost, 
      total_products_shipped, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  activeOrder = await getActiveOrder(player.id);

  await dbRun(
    'UPDATE player SET money = GREATEST(money - $1, -2147483647), progress = 0 WHERE id = $2',
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

const getShippingCostPerMile = async (player) => {
  const hasShipstationTech = await playerHasTechnology(player.id, 'shipstation');
  const shipping_cost = GAME_SHIPPING_COST_PER_MILE;
  if (hasShipstationTech) {
    shipping_cost *= 0.5;
  }
  if (player.exclusive_logistics_penalty_applied) {
    shipping_cost *= 1.5;
  }
  return shipping_cost;
}

const calculateShippingAndBuyLabel = async (player, distance) => {
  const playerId = player.id;
  const product = await dbGet(
    'SELECT p.weight, p.cost_to_build, p.sales_price FROM products p JOIN player_products pp ON p.id = pp.product_id WHERE pp.player_id = $1',
    [playerId],
    'Failed to retrieve product info'
  );

  const shipping_cost_per_mile = await getShippingCostPerMile(player);
  let shipping_cost = distance * shipping_cost_per_mile;
  const total_cost = Math.round(shipping_cost + product.cost_to_build);
  const data = { shipping_cost, total_cost };
  return data;
};

const getOrderById = async (orderId) => {
  return await dbGet(
    'SELECT * FROM orders WHERE id = $1',
    [orderId],
    'Failed to retrieve order'
  );
};

const getShippingSteps = async (playerId) => {
  let shipping_steps = DEFAULT_SHIPPING_STEPS;

  const hasPresetTech = await playerHasTechnology(playerId, 'smartfill');
  if (hasPresetTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await playerHasTechnology(playerId, 'rate_shopper');
  if (hasRateshopperTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'rate_shopping');
  }

  return shipping_steps;
};

const OrderCompleted = async (orderId, player) => {
  const playerId = player.id;
  const product = await getActiveProduct(player);
  const order = await getOrderById(orderId);
  const inventory = await getInventoryInfo(playerId);

  if(!product || !order || !inventory || inventory.length === 0) {
    return 0;
  }
  
  let orders_shipped = player.orders_per_ship;
  let revenue = Math.round(product.sales_price * order.product_quantity);
  let order_state = OrderStates.Shipped;
  const productQuantity = order.product_quantity;

  if (inventory[0].on_hand < (productQuantity)) {
    revenue = 0;
    orders_shipped = 0;
    order_state = OrderStates.Lost;
    orders_shipped = 0;
  } else {
    await dbRun(
      'UPDATE inventory SET on_hand = on_hand - $1 WHERE player_id = $2 AND product_id = $3',
      [productQuantity, playerId, product.id],
      'Failed to deduct stock from inventory'
    );
  }

  await dbRun(
    `UPDATE player SET 
      money = LEAST(money + $1, 2147483647), 
      orders_shipped = LEAST(orders_shipped + $2, 2147483647), 
      total_money_earned = LEAST(total_money_earned + $3, 2147483647)
      WHERE id = $4`,
    [revenue, orders_shipped, revenue, playerId],
    'Failed to update money'
  );

  await dbRun(
    'UPDATE orders SET state = $1, active = false WHERE id = $2',
    [order_state, orderId],
    'Failed to update order status'
  );

  return orders_shipped;
};

const OrderCanceled = async (orderId) => {
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
  getOrderList,
  calculateDistance,
  getShippingCostPerMile
};