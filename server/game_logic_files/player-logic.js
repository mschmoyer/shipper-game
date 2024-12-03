const { dbRun, dbGet, dbAll } = require('../database');
const { BASE_BUILDING_SPEED_SECONDS, BASE_SHIPPING_SPEED_SECONDS, BASE_INITIAL_MONEY, BASE_PRODUCTS_PER_ORDER, BASE_PRODUCTS_PER_BUILD } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { assignRandomProductToPlayer } = require('./product-logic');
const { OrderStates } = require('../constants');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 minute in milliseconds

const CreateNewPlayer = async (name, businessName) => {
  const initialProgress = 0;
  const initialIsShipping = false;
  const initialTechPoints = 0;
  const initialTechLevel = 1;
  const initialOrdersShipped = 0;
  const initialTotalMoneyEarned = 0;

  const result = await dbRun(
    `INSERT INTO player (name, business_name, progress, is_shipping, money, tech_points, 
     tech_level, orders_shipped, total_money_earned, products_per_order, products_per_build,
     shipping_speed, building_speed) 
     VALUES 
     ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [name, businessName, initialProgress, initialIsShipping, BASE_INITIAL_MONEY, initialTechPoints, 
      initialTechLevel, initialOrdersShipped, initialTotalMoneyEarned, BASE_PRODUCTS_PER_ORDER, BASE_PRODUCTS_PER_BUILD,
      BASE_SHIPPING_SPEED_SECONDS, BASE_BUILDING_SPEED_SECONDS],
    'Failed to create account'
  );
  const playerId = result.rows[0].id;
  await initializeTechTree(playerId);
  await assignRandomProductToPlayer(playerId);
  return playerId;
};


const CalculatePlayerReputation = async (playerId) => {
  const currentTime = Date.now();

  if (reputationCache[playerId] && (currentTime - reputationCache[playerId].timestamp < CACHE_EXPIRATION_TIME)) {
    return reputationCache[playerId].score;
  }

  const orders = await dbAll(
    `SELECT state, due_by_time, 
            start_time + interval '1 second' * duration AS end_time 
     FROM orders 
     WHERE player_id = $1 and created_at > NOW() - INTERVAL '5 minutes'`,
    [playerId],
    'Failed to retrieve orders'
  );

  let positiveCount = 0;
  let negativeCount = 0;

  for (const order of orders) {
    const dueByTime = new Date(order.due_by_time);
    const endTime = new Date(order.end_time);

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
};

const getPlayerInfo = async (playerId) => {
  if (!playerId || playerId === 'null') {
    console.error('No playerId passed to getPlayerInfo');
    return null;
  }
  const query = `SELECT *, 
                  money, 
                  EXTRACT(EPOCH FROM (NOW() - created_at)) AS elapsed_time
                  FROM player 
                  WHERE id = $1`;
  let row = await dbGet(query, [playerId]);
  
  if(row) {
    const reputation = await CalculatePlayerReputation(playerId);
    row.reputation = reputation; 
    return row;
  } else {
    console.error('Failed to retrieve player info');
    return null;
  }
};

module.exports = {
  getPlayerInfo,
  CreateNewPlayer,
  CalculatePlayerReputation
};
