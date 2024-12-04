const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { OrderStates, BASE_ORDER_SPAWN_MILLISECONDS, MAXIMUM_ORDER_QUEUE_SIZE, GAME_TIME_LIMIT_SECONDS } = require('../constants');
const { ProductCompleted, productTick } = require('./product-logic');
const { OrderCanceled, OrderCompleted, GenerateOrder, getOrderList } = require('./shipping-logic');
const { CreateNewPlayer, CalculatePlayerReputation } = require('./player-logic');

const generateInitialGameState = async (name, businessName) => {
  console.log('User started a new game! Details:', { name, businessName });

  const playerId = await CreateNewPlayer(name, businessName);
  // console.log('Generated playerId in generateInitialGameState:', playerId);
  return playerId;
};

async function expirePlayer(player) {
  console.log(`Expiring player: ${player.id} - ${player.name} - ${player.business_name}`);

  // Calculate final fields
  const finalMoney = player.money;
  const finalTechLevel = player.tech_level;
  const finalOrdersShipped = player.orders_shipped;
  const finalReputation = await CalculatePlayerReputation(player.id);

  // Set player to inactive and update final fields
  await dbRun(
    'UPDATE player SET active = false, final_money = $1, final_tech_level = $2, final_orders_shipped = $3, final_reputation = $4 WHERE id = $5',
    [finalMoney, finalTechLevel, finalOrdersShipped, finalReputation, player.id],
    'Failed to expire player'
  );
}

const gameTick = async (player) => {
  
  const timeRemainingSeconds = Math.max(GAME_TIME_LIMIT_SECONDS - player.elapsed_time, 0);

  if (timeRemainingSeconds <= 0) {
    await expirePlayer(player);
    return { orders: [], secondsUntilNextOrder: 0, timeRemainingSeconds };
  }

  const orders = await getOrderList(
    'player_id = $1 AND active = true',
    [player.id]
  );

  for (const order of orders) {
    if (order.state === OrderStates.InProgress && order.elapsed_time >= order.duration) {
      await OrderCompleted(order.id, player.id);
    } else if (order.state !== OrderStates.InProgress && order.delta_to_due_date <= 0) {
      await OrderCanceled(order.id, player.id);
    }
  }

  await productTick(player.id); 

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

  if (orders.length < MAXIMUM_ORDER_QUEUE_SIZE && readyForNewOrder) {
    await GenerateOrder(player.id);
  }

  const secondsUntilNextOrder = Math.round(readyForNewOrder ? 0 : Math.max(0, spawnTime - lastOrder.seconds_since_creation));
  
  return { orders, secondsUntilNextOrder, timeRemainingSeconds };
};

const handleTruckToWarehouseGameCompletion = async (playerId, succeeded) => {
  if (succeeded) {
    // Handle success logic, e.g., reward player
    console.log(`Player ${playerId} succeeded in Truck to Warehouse game.`);
  } else {
    // Handle failure logic, e.g., penalize player
    console.log(`Player ${playerId} failed in Truck to Warehouse game.`);
    await dbRun(
      'UPDATE inventory SET on_hand = 0 WHERE player_id = $1',
      [playerId],
      'Failed to update stock level'
    );
  }
};

const handleFindTheProductHaystackGameCompletion = async (playerId, succeeded) => {
  if (succeeded) {
    // Handle success logic, e.g., reward player
    console.log(`Player ${playerId} succeeded in Find the Product Haystack game.`);
  } else {
    // Handle failure logic, e.g., penalize player
    console.log(`Player ${playerId} failed in Find the Product Haystack game.`);
    const player = await dbGet('SELECT money FROM player WHERE id = $1', [playerId], 'Failed to retrieve player money');
    const deduction = Math.min(5000, player.money);
    await dbRun(
      'UPDATE player SET money = money - $1 WHERE id = $2',
      [deduction, playerId],
      'Failed to update player money'
    );
  }
};

module.exports = { 
  generateInitialGameState, 
  gameTick,
  productTick,
  ProductCompleted,
  expirePlayer,
  handleTruckToWarehouseGameCompletion,
  handleFindTheProductHaystackGameCompletion
};