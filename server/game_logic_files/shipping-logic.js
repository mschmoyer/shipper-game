const { dbRun, dbGet, dbAll } = require('../database');

const { XP_GAINED_PER_OPERATION, MAXIMUM_ORDER_QUEUE_SIZE, 
  GAME_SHIPPING_COST_PER_MILE, OrderStates } = require('../constants');

const { businessHasTechnology, isAdvertisingCampaignActive } = require('./technology-logic');
const { gainXP } = require('./skill-logic');
const { getActiveProduct, UpdateInventoryCount } = require('./product-logic');
const { CreateOrder } = require('./order-creation-logic');

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

const OrderTick = async (business, allProducts, elapsed_time, active_order) => {

  if(business.orders_shipped === 0 && business.products_built < 6) {
    return { orders: [], secondsUntilNextOrder: 0, ordersShipped: 0 };
  }
  const orders = await getOrderList(
    'business_id = $1 AND active = true',
    [business.id]
  );
  for (const loop_order of orders) {
    await CheckOrderState(loop_order, business);
  }

  let ordersShipped = await GenerateOrders(business, allProducts, elapsed_time, orders);

  const lastOrder = await dbGet(
    `SELECT *,
      EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since_creation
      FROM orders 
      WHERE business_id = $1 ORDER BY id DESC LIMIT 1`,
    [business.id],
    'Failed to retrieve last order'
  );

  const spawnTime = (business.order_spawn_milliseconds || BASE_ORDER_SPAWN_MILLISECONDS) / 1000;
  const readyForNewOrder = (!lastOrder || lastOrder.seconds_since_creation >= spawnTime);
  const secondsUntilNextOrder = Math.round(readyForNewOrder ? 0 : Math.max(0, spawnTime - lastOrder.seconds_since_creation));
  
  if(ordersShipped <= 0 && readyForNewOrder && orders.length < MAXIMUM_ORDER_QUEUE_SIZE) {
    await CreateOrder(business, allProducts);
    if( await isAdvertisingCampaignActive(business) ) {
      await CreateOrder(business, allProducts);
    }
  }

  if (ordersShipped > 0) {
    await gainXP(business, ordersShipped * XP_GAINED_PER_OPERATION);
  }

  const hasHireWarehouseWorker = await businessHasTechnology(business.id, 'hire_warehouse_worker');
  if (hasHireWarehouseWorker && (!active_order && ordersShipped < 2)) {
    await shipOrder(business);
  }

  const oData = { orders, secondsUntilNextOrder, ordersShipped };
  return oData;
}

const CheckOrderState = async (order, business) => {
  if (!order) {
    return 0;
  }
  let ordersShipped = 0;
  if (order.state === OrderStates.InProgress && order.elapsed_time >= order.duration) {
    ordersShipped += await OrderCompleted(order.id, business);
  } else if (order.state !== OrderStates.InProgress && order.delta_to_due_date <= 0) {
    await OrderCanceled(order.id);
  }
  return ordersShipped;
}

const GenerateOrders = async (business, allProducts, elapsed_time, orders) => {

  let ordersShipped = 0;
  let orders_to_ship = 0;
  let orders_to_generate = 0; 
  let available_stock = 0;
  let orders_shippable = 0;

  const spawnRateMs = Math.max(business.order_spawn_milliseconds, 10) || BASE_ORDER_SPAWN_MILLISECONDS;
  const shipRateMs = business.shipping_duration;

  orders_to_generate = (elapsed_time / spawnRateMs) * business.order_spawn_count;
  if( await isAdvertisingCampaignActive(business) ) {
    orders_to_generate *= 2;
  } 

  const hasHireWarehouseWorker = await businessHasTechnology(business.id, 'hire_warehouse_worker');
  if (hasHireWarehouseWorker) {
    orders_shippable = (elapsed_time / shipRateMs) * business.orders_per_ship;
    
    // We can only ship as many orders as we have in the queue
    orders_shippable = Math.min(orders_shippable, orders_to_generate + orders.length);
    orders_to_ship = Math.min(orders_shippable, orders_to_generate);

    // TODO: fix allProducts[0]
    ordersShipped = await _synthesizeShippedOrders(business, orders_to_ship, allProducts);

    orders_shippable -= ordersShipped;

    // TODO: fix allProducts[0]
    available_stock = allProducts[0].on_hand - ordersShipped;

    if( orders.length > 0 ) {
      const existing_orders_to_mark_shipped = Math.floor(Math.min(Math.min(orders.length, orders_shippable),available_stock));

      for (let i = 0; i < existing_orders_to_mark_shipped; i++) {
        let orders_completed = await OrderCompleted(orders[i].id, business);
        available_stock -= orders_completed * business.products_per_order;
        orders_shippable -= orders_completed;
        ordersShipped += orders_completed;
      }
    }
  }

  orders_to_generate = Math.max(0, orders_to_generate - ordersShipped);
  orders_to_generate = Math.min(orders_to_generate, MAXIMUM_ORDER_QUEUE_SIZE - orders.length);

  if(orders_to_generate >= 1) {
    for (let i = 0; i < orders_to_generate; i++) {
      await CreateOrder(business, allProducts);
    }
  }

  return ordersShipped;
}

const _synthesizeShippedOrders = async (business, orders_to_ship, allProducts) => {

  const hasHireWarehouseWorker = await businessHasTechnology(business.id, 'hire_warehouse_worker');
  if (!hasHireWarehouseWorker || orders_to_ship < 1) {
    return 0;
  }  
  
  let totalRevenue = 0;
  let totalCost = 0;
  let totalOrdersShipped = 0;
  let inventoryToDeduct = [0, 0, 0];

  for (let i = 0; i < orders_to_ship; i++) {
    const ghostOrder = await CreateOrder(business, allProducts, true);
    console.log('ghostOrder:', ghostOrder);
    inventoryToDeduct[0] = ghostOrder.inventoryToDeduct[0];
    inventoryToDeduct[1] = ghostOrder.inventoryToDeduct[1];
    inventoryToDeduct[2] = ghostOrder.inventoryToDeduct[2];
    totalRevenue += ghostOrder.totalRevenue;
    totalCost += ghostOrder.totalCost;
    totalOrdersShipped += 1;

    if (inventoryToDeduct[0] > allProducts[0].on_hand ||
        inventoryToDeduct[1] > allProducts[1].on_hand ||
        inventoryToDeduct[2] > allProducts[2].on_hand) {
      break;
    }
  }
  orders_to_ship -= totalOrdersShipped;

  console.log(`orders_to_ship: ${orders_to_ship}, totalOrdersShipped: ${totalOrdersShipped}, 
    totalRevenue: ${totalRevenue}, totalCost: ${totalCost}, inventoryToDeduct: ${inventoryToDeduct}`);

  totalRevenue = Math.round(totalRevenue);
  if(totalOrdersShipped > 0) {
    await dbRun(
      `UPDATE business 
        SET 
          orders_shipped = LEAST(orders_shipped + $1, 2147483647-1), 
          total_money_earned = LEAST(total_money_earned + $2, 2147483647-1),
          money = LEAST(money + $2, 2147483647-1)
        WHERE id = $3
        RETURNING orders_shipped, total_money_earned, money`,
      [totalOrdersShipped, totalRevenue, business.id],
      `Failed to update business orders_shipped, total_money_earned, and money for businessId: ${business.id}`
    );

    await UpdateInventoryCount(business.id, allProducts[0].id, -inventoryToDeduct[0]);
    await UpdateInventoryCount(business.id, allProducts[1].id, -inventoryToDeduct[1]);
    await UpdateInventoryCount(business.id, allProducts[2].id, -inventoryToDeduct[2]);
  }

  return totalOrdersShipped;
}

const calculateDistance = async (businessId) => {
  const hasMultiWarehouseTech = await businessHasTechnology(businessId, 'multi_warehouse');
  let shippingDistance = 300;
  if (hasMultiWarehouseTech) {
    shippingDistance = shippingDistance / 2;
  }
  return shippingDistance;
}

const shipOrder = async (business) => {
  let activeOrder = await getActiveOrder(business.id);
  const shippedOrders = await CheckOrderState(activeOrder, business);
  if (activeOrder && shippedOrders === 0) {
    //return { error: 'You are busy shipping.' };
    return {};
  } else {
    const hasOrderGridFilters = await businessHasTechnology(business.id, 'order_grid_filters');
    if (hasOrderGridFilters) {
      activeOrder = await getOrder(
        'active=true AND business_id = $1 AND state = $2 ORDER BY due_by_time ASC',
        [business.id, OrderStates.AwaitingShipment]
      );
    } else {
      activeOrder = await getOrder(
        'active=true AND business_id = $1 AND state = $2',
        [business.id, OrderStates.AwaitingShipment]
      );
    }
  }

  if (!activeOrder) {
    return { error: 'No orders available for shipping' };
  }

  const pData = await getActiveProduct(business);
  const on_hand = pData.on_hand;

  let hasEnoughInventory = on_hand >= business.products_per_order;
  if (!hasEnoughInventory) {
    return { error: 'Not enough inventory!' };
  }

  const total_duration = Math.round(business.shipping_duration);
  const shippingData = await calculateShippingAndBuyLabel(business, activeOrder.distance);
  const total_products_shipped = Math.min(on_hand, business.products_per_order * business.orders_per_ship);
  const total_shipping_cost = Math.round(shippingData.shipping_cost * total_products_shipped);

  await dbRun(
    `UPDATE orders 
      SET duration = $1, state = $2, start_time = NOW(), shipping_cost = $3, product_quantity = $4 
      WHERE id = $5`,
    [total_duration, OrderStates.InProgress, total_shipping_cost, 
      total_products_shipped, activeOrder.id],
    'Failed to update order duration, state, start time, and shipping cost'
  );

  activeOrder = await getActiveOrder(business.id);

  await dbRun(
    'UPDATE business SET money = GREATEST(money - $1, -2147483647), progress = 0 WHERE id = $2',
    [total_shipping_cost, business.id],
    'Failed to update shipping status'
  );

  return { 
    message: 'Shipping started successfully.',
    total_duration,
    shipping_steps: business.shipping_steps,
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

    order.required_products = await dbAll(
      `SELECT p.name, p.emoji, op.quantity 
        FROM order_products op 
        JOIN products p ON p.id = op.product_id 
        WHERE op.order_id = $1`,
      [order.id],
      'Failed to retrieve order products'
    );
  }

  return orders;
};

const getActiveOrder = async (businessId) => {
  return await getOrder(
    'business_id = $1 AND active = true AND state = $2',
    [businessId, OrderStates.InProgress]
  );
};

const getShippingCostPerMile = async (business) => {
  const hasShipstationTech = await businessHasTechnology(business.id, 'shipstation');
  const shipping_cost = GAME_SHIPPING_COST_PER_MILE;
  if (hasShipstationTech) {
    shipping_cost *= 0.5;
  }
  if (business.exclusive_logistics_penalty_applied) {
    shipping_cost *= 1.5;
  }
  return shipping_cost;
}

const calculateShippingAndBuyLabel = async (business, distance) => {

  // TODO: This should handle multiple different products on an order. order_products table. 
  const product = await dbGet(
    `SELECT p.weight, p.cost_to_build, p.sales_price 
      FROM products p 
      WHERE p.business_id = $1
      ORDER BY id ASC
      LIMIT 1`,
    [business.id],
    'Failed to fetch product details.'
  );

  const shipping_cost_per_mile = await getShippingCostPerMile(business);
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

const getShippingSteps = async (businessId) => {
  let shipping_steps = DEFAULT_SHIPPING_STEPS;

  const hasPresetTech = await businessHasTechnology(businessId, 'smartfill');
  if (hasPresetTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await businessHasTechnology(businessId, 'rate_shopper');
  if (hasRateshopperTech) {
    shipping_steps = shipping_steps.filter(step => step.step_code !== 'rate_shopping');
  }

  return shipping_steps;
};

const OrderCompleted = async (orderId, business) => {
  const businessId = business.id;
  const orders_shipped = 1;

  // Get each order item. 
  const order_products = await dbAll(
    `SELECT p.id, p.cost_to_build, p.sales_price, op.quantity
    FROM order_products op
    JOIN products p ON p.id = op.product_id
    WHERE op.order_id = $1`,
    [orderId],
    'Failed to retrieve order products'
  );

  console.log('OrderCompleted: order_products', order_products);

  let revenue = 0;
  
  // Gather total revenue and deduct stock. 
  for (const product of order_products) {
    revenue += product.sales_price * product.quantity;
    await dbRun(
      'UPDATE products SET on_hand = on_hand - $1 WHERE business_id = $2 AND id = $3',
      [product.quantity, businessId, product.id],
      'Failed to deduct stock from inventory'
    );
  }

  console.log('OrderCompleted: revenue', revenue);

  // Award funds and statistics. 
  await dbRun(
    `UPDATE business SET 
      money = LEAST(money + $1, 2147483647), 
      orders_shipped = LEAST(orders_shipped + $2, 2147483647), 
      total_money_earned = LEAST(total_money_earned + $1, 2147483647)
      WHERE id = $3`,
    [revenue, orders_shipped, businessId],
    'Failed to update money'
  );

  // Mark the order shipped. 
  await dbRun(
    'UPDATE orders SET state = $1, active = false WHERE id = $2',
    [OrderStates.Shipped, orderId],
    'Failed to update order status'
  );

  return 1;
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