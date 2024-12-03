const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { OrderStates, BASE_INITIAL_MONEY, BASE_ORDER_ARRIVAL_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE, GAME_TIME_LIMIT_SECONDS } = require('../constants');
const { ProductCompleted, productTick } = require('./product-logic');
const { OrderCanceled, OrderCompleted, GenerateOrder } = require('./shipping-logic');
const { CreateNewPlayer } = require('./player-logic');

const generateInitialGameState = async (name, businessName) => {
  console.log('generateInitialGameState called with:', { name, businessName });

  try {
    const playerId = await CreateNewPlayer(name, businessName);
    console.log('Generated playerId in generateInitialGameState:', playerId);
    return playerId;
  } catch (err) {
    console.error('Error in generateInitialGameState:', err);
    throw new Error(err.message);
  }
};

async function expirePlayer(playerId) {
  const player = await dbGet('SELECT * FROM player WHERE id = ?', [playerId], 'Failed to retrieve player');
  
  // Calculate final fields
  const finalMoney = player.money;
  const finalTechLevel = player.techLevel;
  const finalOrdersShipped = player.ordersShipped;
  const finalReputation = await CalculatePlayerReputation(playerId);

  // Set player to inactive and update final fields
  await dbRun(
    'UPDATE player SET active = 0, finalMoney = ?, finalTechLevel = ?, finalOrdersShipped = ?, finalReputation = ? WHERE id = ?',
    [finalMoney, finalTechLevel, finalOrdersShipped, finalReputation, playerId],
    'Failed to expire player'
  );
}

const gameTick = async (playerId, player) => {

  if(!player) {
    return { "error": "Player not found" };
  }

  const playerTimeRemaining = Math.max(GAME_TIME_LIMIT_SECONDS - player.elapsedTime, 0);

  if (playerTimeRemaining <= 0) {
    await expirePlayer(playerId);
    return { secondsUntilNextOrder: 0, playerTimeRemaining };
  }

  const activeOrders = await dbAll(
    `SELECT *,
      (strftime('%s', 'now') - strftime('%s', startTime)) AS elapsedTime,
      (strftime('%s', 'now') > strftime('%s', dueByTime)) AS isOverdue
      FROM orders 
      WHERE playerId = ? AND active = 1`,
    [playerId],
    'Failed to retrieve active orders'
  );

  for (const order of activeOrders) {
    if (order.state === OrderStates.InProgress && order.elapsedTime >= order.duration) {
      await OrderCompleted(order.id, playerId);
    } else if (order.isOverdue) {
      await OrderCanceled(order.id, playerId);
    }
  }

  await productTick(playerId); 

  const lastOrder = await dbGet(
    `SELECT *,
      (strftime('%s', 'now') - strftime('%s', startTime)) AS elapsedTime,
      strftime('%s', 'now') AS currentTime
      FROM orders 
      WHERE playerId = ? ORDER BY id DESC LIMIT 1`,
    [playerId],
    'Failed to retrieve last order'
  );

  const newOrderInterval = BASE_ORDER_ARRIVAL_SECONDS;
  const maximumGeneratableOrders = MAXIMUM_ORDER_QUEUE_SIZE;
  const readyForNewOrder = (!lastOrder || lastOrder.elapsedTime >= newOrderInterval);

  if (activeOrders.length < maximumGeneratableOrders && readyForNewOrder) {
    await GenerateOrder(playerId);
  }

  const secondsUntilNextOrder = readyForNewOrder ? 0 : Math.max(0, newOrderInterval - lastOrder.elapsedTime);
  return { secondsUntilNextOrder: Math.round(secondsUntilNextOrder), timeRemainingSeconds: playerTimeRemaining };
};

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 minute in milliseconds

const CalculatePlayerReputation = async (playerId) => {
  const currentTime = Date.now();

  if (reputationCache[playerId] && (currentTime - reputationCache[playerId].timestamp < CACHE_EXPIRATION_TIME)) {
    return reputationCache[playerId].score;
  }

  try {
    const orders = await dbAll(
      `SELECT state, dueByTime, startTime, duration 
       FROM orders 
       WHERE playerId = ? and createdAt > datetime('now', '-5 minutes')`,
      [playerId],
      'Failed to retrieve orders'
    );

    let positiveCount = 0;
    let negativeCount = 0;

    for (const order of orders) {
      const dueByTime = new Date(order.dueByTime);
      const endTime = new Date(new Date(order.startTime).getTime() + order.duration * 1000);

      if (order.state === OrderStates.Canceled) {
        negativeCount++;
      } else if (order.state === OrderStates.Shipped && endTime <= dueByTime) {
        positiveCount++;
      }
    }

    const totalOrders = positiveCount + negativeCount;
    const reputationScore = totalOrders > 0 ? (positiveCount / totalOrders) * 100 : 100;

    reputationCache[playerId] = {
      score: Math.round(reputationScore),
      timestamp: currentTime
    };

    return reputationCache[playerId].score;
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { 
  generateInitialGameState, 
  gameTick,
  CalculatePlayerReputation,
  productTick,
  ProductCompleted,
  expirePlayer
};