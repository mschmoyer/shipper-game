const { dbRun, dbGet, dbAll } = require('../database');
const { BASE_ORDER_SPAWN_MILLISECONDS, SPEED_BOOST_FACTOR, BASE_BUILDING_SPEED_SECONDS, BASE_SHIPPING_SPEED_SECONDS, BASE_INITIAL_MONEY, BASE_PRODUCTS_PER_ORDER, BASE_PRODUCTS_PER_BUILD } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { OrderStates } = require('../constants');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000;

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
     shipping_speed, building_speed, order_spawn_milliseconds) 
     VALUES 
     ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
    [name, businessName, initialProgress, initialIsShipping, BASE_INITIAL_MONEY, initialTechPoints, 
      initialTechLevel, initialOrdersShipped, initialTotalMoneyEarned, BASE_PRODUCTS_PER_ORDER, BASE_PRODUCTS_PER_BUILD,
      BASE_SHIPPING_SPEED_SECONDS, BASE_BUILDING_SPEED_SECONDS, BASE_ORDER_SPAWN_MILLISECONDS],
    'Failed to create account'
  );
  const playerId = result.rows[0].id;
  console.log('Created new player with id:', playerId);
  await initializeTechTree(playerId);
  
  // Dynamically require assignRandomProductToPlayer to avoid circular dependency
  const { assignRandomProductToPlayer } = require('./product-logic');
  await assignRandomProductToPlayer(playerId);
  
  return playerId;
};

// Calculate the player's reputation score based on their recent order history
// Cached for a short period of time to reduce database queries
// Reputation score is a percentage of successful orders out of total orders
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

    if (order.state === OrderStates.Canceled || order.state === OrderStates.Lost || order.state === OrderStates.Returned) {
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

const increaseShippingSpeed = async (playerId) => {
  // console.log('Increasing shipping speed for player:', playerId);
  const query = `UPDATE player SET shipping_speed = GREATEST(shipping_speed - $1, 1000) WHERE id = $2 RETURNING shipping_speed`;
  await dbRun(query, [SPEED_BOOST_FACTOR, playerId], 'Failed to increase shipping speed');
};

const increaseBuildingSpeed = async (playerId) => {
  // console.log('Increasing building speed for player:', playerId);
  const query = `UPDATE player SET building_speed = GREATEST(building_speed - $1, 1000) WHERE id = $2 returning building_speed`;
  await dbRun(query, [SPEED_BOOST_FACTOR, playerId], 'Failed to increase building speed');
};

const increaseOrderSpawnRate = async (playerId) => {
  // console.log('Increasing order spawn rate for player:', playerId);
  const query = `UPDATE player SET order_spawn_milliseconds = GREATEST(order_spawn_milliseconds - $1, 1000) WHERE id = $2 returning order_spawn_milliseconds`;
  await dbRun(query, [SPEED_BOOST_FACTOR * 10, playerId], 'Failed to increase order spawn rate');
}

const addSkillPoints = async (playerId, points) => {
  // console.log('Adding skill points for player:', playerId);
  const query = `UPDATE player SET available_points = available_points + $1 WHERE id = $2`;
  await dbRun(query, [points, playerId], 'Failed to add skill points');
}

const upgradeSkill = async (playerId, skill) => {
  const player = await getPlayerInfo(playerId);
  if (player.available_points <= 0) {
    return { success: false, error: 'Not enough available points' };
  }
  let query;
  switch (skill) {
    case 'shipping_points':
      query = `UPDATE player SET shipping_points = shipping_points + 1, available_points = available_points - 1 WHERE id = $1`;
      console.log('Upgrading shipping points for player:', playerId);
      increaseShippingSpeed(playerId);
      break;
    case 'building_points':
      query = `UPDATE player SET building_points = building_points + 1, available_points = available_points - 1 WHERE id = $1`;
      console.log('Upgrading building points for player:', playerId);
      increaseBuildingSpeed(playerId);
      break;
    case 'order_spawn_points':
      query = `UPDATE player SET order_spawn_points = order_spawn_points + 1, available_points = available_points - 1 WHERE id = $1`;
      console.log('Upgrading order spawn points for player:', playerId);
      increaseOrderSpawnRate(playerId);
      break;
    default:
      return { success: false, error: 'Invalid skill' };
  }

  await dbRun(query, [playerId], 'Failed to upgrade skill');
  return { success: true };
};

module.exports = {
  getPlayerInfo,
  CreateNewPlayer,
  CalculatePlayerReputation,
  increaseShippingSpeed,
  increaseBuildingSpeed,
  upgradeSkill,
  addSkillPoints
};
