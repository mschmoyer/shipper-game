const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { OrderStates, BASE_INITIAL_MONEY, BASE_ORDER_ARRIVAL_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE, GAME_TIME_LIMIT_SECONDS } = require('../constants');
const { ProductCompleted, productTick } = require('./product-logic');
const { OrderCanceled, OrderCompleted, GenerateOrder, getOrderList } = require('./shipping-logic');
const { CreateNewPlayer, CalculatePlayerReputation } = require('./player-logic');

const generateInitialGameState = async (name, businessName) => {
  console.log('generateInitialGameState called with:', { name, businessName });

  const playerId = await CreateNewPlayer(name, businessName);
  console.log('Generated playerId in generateInitialGameState:', playerId);
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
      // TODO: if past due, then still count as shipped but penalize user. 
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

  const readyForNewOrder = (!lastOrder || lastOrder.seconds_since_creation >= BASE_ORDER_ARRIVAL_SECONDS);

  if (orders.length < MAXIMUM_ORDER_QUEUE_SIZE && readyForNewOrder) {
    await GenerateOrder(player.id);
  }

  const secondsUntilNextOrder = Math.round(readyForNewOrder ? 0 : Math.max(0, BASE_ORDER_ARRIVAL_SECONDS - lastOrder.seconds_since_creation));
  
  return { orders, secondsUntilNextOrder, timeRemainingSeconds };
};

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 minute in milliseconds

module.exports = { 
  generateInitialGameState, 
  gameTick,
  productTick,
  ProductCompleted,
  expirePlayer
};