const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { gainXP } = require('./player-logic');
const { playerHasTechnology } = require('./technology-logic');
const { XP_GAINED_PER_OPERATION } = require('../constants');

const productTick = async (player, product, inventory, elapsed_time) => {
  let building_speed = Math.max(player.building_speed, 10);

  const products_to_build = Math.floor(elapsed_time / building_speed);

  // check if player has technology hire_fabricator
  const hasHireFabricator = await playerHasTechnology(player.id, 'hire_fabricator');

  // The player could be building so fast that products could get build in between the 1 second game tick. Simulate this time gap. 
  let totalProductsBuilt = 0;
  if(products_to_build > 0 && hasHireFabricator && player.building_automation_enabled) {
    totalProductsBuilt = await _synthesizeBuiltProducts(player, product, inventory, products_to_build);
  }

  const activeProducts = await dbAll(
    `SELECT *, EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time 
     FROM purchase_orders 
     WHERE player_id = $1 AND active = true`,
    [player.id],
    'Failed to retrieve active purchase orders'
  );

  for (const product of activeProducts) {
    totalProductsBuilt += await CheckProductState(product, player.id);
  }

  if (totalProductsBuilt > 0) {
    await gainXP(player, totalProductsBuilt * XP_GAINED_PER_OPERATION);

    // update player products_built
    await dbRun(
      'UPDATE player SET products_built = products_built + $1 WHERE id = $2',
      [totalProductsBuilt, player.id],
      'Failed to update player products_built'
    );
  }

  if(hasHireFabricator && !player.activeProducts) {
    console.log('productTick - player automated and no build. Starting product build');
    await startProductBuild(player.id);
  }
  
  return totalProductsBuilt;
};

const CheckProductState = async (product, playerId) => {
  if (!product) {
    return 0;
  }
  let totalProductsBuilt = 0;
  const elapsedTime = product.elapsed_time;
  if (elapsedTime >= product.duration || product.start_time === null) {
    totalProductsBuilt += await ProductCompleted(product.id, playerId);
  }
  return totalProductsBuilt;
}

const _synthesizeBuiltProducts = async (player, product, inventory, products_to_build) => {
  if(products_to_build <= 0) {
    return;
  }

  let money = player.money;
  let totalProducts = 0;
  let totalCost = 0;

  // loop for each product to build. if there is enough money and remaining stock, incremeent the products_built counter
  for (let i = 0; i < products_to_build; i++) {
    const cost_to_build = product.cost_to_build * player.products_per_build;

    // NOTE: i'm letting people go negative...
    money -= cost_to_build;
    totalProducts += player.products_per_build;
    totalCost += cost_to_build;
  }

  if (totalProducts > 0) {  
    // update the player's money
    updated_money = await dbRun(
      'UPDATE player SET money = money - $1 WHERE id = $2 RETURNING money',
      [totalCost, player.id],
      'Failed to update player money'
    );

    // update inventory
    updated_on_hand = await dbRun(
      'UPDATE inventory SET on_hand = on_hand + $1 WHERE player_id = $2 RETURNING on_hand',
      [totalProducts, player.id],
      'Failed to update inventory'
    );
  }

  // console.log('_synthesizeBuiltProducts - productsToBuild:', products_to_build, 'productsBuilt:', totalProducts, 'costed:', totalCost);
  return totalProducts;
}

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
    `SELECT p.*, 
      pp.product_id 
      FROM products p 
      JOIN player_products pp ON p.id = pp.product_id
      WHERE pp.player_id = $1`,
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

  const hasBundlesTech = await playerHasTechnology(playerId, 'bundles');
  if(hasBundlesTech) {
    product.sales_price = product.sales_price * (hasBundlesTech ? hasBundlesTech : 1);
  }

  const start_time = purchase_order && purchase_order.start_time ? new Date(purchase_order.start_time) : null;
  const elapsed_time = purchase_order ? purchase_order.elapsed_time : 0;
  const progress = start_time ? Math.min((elapsed_time / purchase_order.duration) * 100, 100) : 100;
  const is_building = start_time ? progress < 100 : false;

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

const ProductCompleted = async (purchaseOrderId, playerId) => {
  const purchaseOrder = await dbGet(
    'SELECT * FROM purchase_orders WHERE id = $1',
    [purchaseOrderId],
    'Failed to retrieve purchase order'
  );

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

  return purchaseOrder.quantity;
};

const getActivePurchaseOrder = async (playerId) => {
  return await dbGet(
    'SELECT * FROM purchase_orders WHERE player_id = $1 AND active = true',
    [playerId],
    'Failed to retrieve active purchase order'
  );
}

const startProductBuild = async (playerId) => {
  
  let activeOrder = await getActivePurchaseOrder(playerId);

  const builtOrders = await CheckProductState(activeOrder, playerId);

  if (activeOrder && builtOrders === 0) {
    return { error: 'An active purchase order is still in progress' };
  }

  const { building_steps, building_duration } = await getBuildingSteps(playerId);

  const activeProduct = await getActiveProduct(playerId);

  // Check if the player has enough money to build the product. costToBuild * quantity
  const player = await dbGet(
    'SELECT * FROM player WHERE id = $1',
    [playerId],
    'Failed to retrieve player info'
  );

  const quantity = player.products_per_build || 1;
  const hasEnoughMoney = player.money >= activeProduct.cost_to_build * quantity;

  // NOTE: i'm letting people go negative...
  // if (!hasEnoughMoney) {
  //   console.log('Player does not have enough money to build the product');
  //   return { error: 'You do not have enough money to build the product' };
  // }

  // log everything important in one line
  console.log('startProductBuild - playerId:', playerId, 'product:', activeProduct.name, 'quantity:', quantity, 'costToBuild:', activeProduct.cost_to_build, 'totalCost:', activeProduct.cost_to_build * quantity);

  const totalBuildCost = activeProduct.cost_to_build * quantity;
  // Deduct the money. 
  await dbRun(
    'UPDATE player SET money = money - $1 WHERE id = $2',
    [totalBuildCost, playerId],
    'Failed to deduct money from player'
  );

  const newPurchaseOrder = await dbRun(
    `INSERT INTO purchase_orders (player_id, start_time, duration, active, quantity, product_id) 
    VALUES 
    ($1, NOW(), $2, true, $3, $4) RETURNING id`,
    [playerId, building_duration, quantity, activeProduct.id],
    'Failed to start product build'
  );

  const building_speed = Math.max(player.building_speed, 100);
  let product_build_ms = (player.building_speed < 100 ? building_speed : (player.building_duration));
  if (product_build_ms > 0 && newPurchaseOrder && newPurchaseOrder.id) {
    await ProductCompleted(newPurchaseOrder.id, playerId);
  }

  return { 
    message: 'Product build started successfully.',
    building_duration,
    building_steps,
    costToBuild: activeProduct.cost_to_build,
    quantity,
    totalCost: activeProduct.cost_to_build * quantity
  };
};

module.exports = {
  assignRandomProductToPlayer,
  getActiveProduct,
  getInventoryInfo,
  getBuildingSteps,
  startProductBuild,
  productTick
};