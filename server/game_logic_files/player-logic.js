const { dbRun, dbGet, dbAll } = require('../database');
const { SPEED_BOOST_FACTOR, XP_FOR_SKILL_POINT } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { OrderStates } = require('../constants');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000;

const CreateNewPlayer = async (name, businessName) => {
  // insert a new player using the default values from player.id = 1
  const result = await dbRun(
    `INSERT INTO player (name, business_name, money, tech_points,
      tech_level, orders_shipped, total_money_earned, products_per_order, products_per_build,
      shipping_speed, building_speed, order_spawn_milliseconds, available_points)
      SELECT $1, $2, money, tech_points, tech_level, orders_shipped, total_money_earned,
      products_per_order, products_per_build, shipping_speed, building_speed, order_spawn_milliseconds, available_points
      FROM player
      WHERE id = 1
      RETURNING id`,
    [name, businessName],
    'Failed to create account'
  );

  const playerId = result.rows[0].id;
  console.log('Created new player with id:', playerId);
  await initializeTechTree(playerId);
  
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

    // Dynamically require getBuildingSteps and getShippingSteps to avoid circular dependency
    const { getBuildingSteps } = require('./product-logic');
    const { getShippingSteps } = require('./shipping-logic');

    // get shipping and building steps and return count of steps and duration for each
    const { building_steps, building_duration } = await getBuildingSteps(playerId);
    row.building_step_count = building_steps.length;
    row.building_duration = building_duration;
    const { shipping_steps, total_duration } = await getShippingSteps(playerId);
    row.shipping_step_count = shipping_steps.length;
    row.shipping_duration = total_duration;

    return row;
  } else {
    console.error('Failed to retrieve player info');
    return null;
  }
};

const increaseShippingSpeed = async (playerId) => {
  // console.log('Increasing shipping speed for player:', playerId);
  const query = `UPDATE player SET shipping_speed = GREATEST(shipping_speed - $1, 1) WHERE id = $2 RETURNING shipping_speed`;
  await dbRun(query, [SPEED_BOOST_FACTOR, playerId], 'Failed to increase shipping speed');
};

const increaseBuildingSpeed = async (playerId) => {
  // console.log('Increasing building speed for player:', playerId);
  const query = `UPDATE player SET building_speed = GREATEST(building_speed - $1, 1) WHERE id = $2 returning building_speed`;
  await dbRun(query, [SPEED_BOOST_FACTOR, playerId], 'Failed to increase building speed');
};

const increaseOrderSpawnRate = async (playerId) => {
  // console.log('Increasing order spawn rate for player:', playerId);
  const query = `UPDATE player SET order_spawn_milliseconds = GREATEST(order_spawn_milliseconds - $1, 1) WHERE id = $2 returning order_spawn_milliseconds`;
  await dbRun(query, [SPEED_BOOST_FACTOR * 10, playerId], 'Failed to increase order spawn rate');
}

const addSkillPoints = async (player, points) => {
  // console.log('Adding skill points for player:', playerId);
  console.log('Adding skill points:', points, ' for player:', player.name, ' (', player.id, ')');
  const query = `UPDATE player SET available_points = available_points + $1 WHERE id = $2`;
  await dbRun(query, [points, player.id], 'Failed to add skill points');
}

const gainXP = async (player, new_xp) => {
  let newTotalXP = player.xp + new_xp;
  const skillPointsGained = Math.floor(newTotalXP / XP_FOR_SKILL_POINT);
  if (skillPointsGained > 0) {
    console.log('Gained XP:', new_xp, ' for player:', player.name, ' (', player.id, ')');
    await addSkillPoints(player, skillPointsGained);
    newTotalXP -= skillPointsGained * XP_FOR_SKILL_POINT;
  }
  
  const query = `UPDATE player SET xp = $1 WHERE id = $2`;
  await dbRun(query, [newTotalXP, player.id], 'Failed to gain XP');
};

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

// update the last_game_update field in player
async function updateLastGameUpdate(playerId, last_game_update) {
  if(!last_game_update) {
    last_game_update = new Date();
  }
  // console.log('last_game_update:', last_game_update);
  const query = `UPDATE player 
                  SET last_game_update = NOW()
                  WHERE id = $2 
                  RETURNING last_game_update, EXTRACT(EPOCH FROM (NOW() - $1)) AS elapsed_time`;
                  
  // return elapsed time since last game update in milliseconds
  const row = await dbGet(query, [last_game_update, playerId], 'Failed to update last game update');

  // log playerId and elapsed_time on one line
  // console.log('updateLastGameUpdate - playerId:', playerId, 'elapsed_time:', row.elapsed_time * 1000);

  return row.elapsed_time * 1000;
}

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

module.exports = {
  getPlayerInfo,
  CreateNewPlayer,
  upgradeSkill,
  addSkillPoints,
  expirePlayer,
  updateLastGameUpdate,
  gainXP
};
