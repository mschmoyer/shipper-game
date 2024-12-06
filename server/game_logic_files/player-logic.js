const { dbRun, dbGet, dbAll } = require('../database');
const { SPEED_BOOST_FACTOR, BASE_XP_FOR_SKILL_POINT } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { OrderStates } = require('../constants');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000;

const CreateNewPlayer = async (name, businessName) => {
  // insert a new player using the default values from player.id = 1
  const result = await dbRun(
    `INSERT INTO player (name, business_name, money, tech_points,
      tech_level, orders_shipped, total_money_earned, products_per_order, products_per_build,
      shipping_speed, building_speed, order_spawn_milliseconds, available_points, reputation, xp)
      SELECT $1, $2, money, tech_points, tech_level, orders_shipped, total_money_earned,
      products_per_order, products_per_build, shipping_speed, building_speed, order_spawn_milliseconds, 
      available_points, reputation, xp
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
    return reputationCache[playerId];
  }

  const orders = await dbAll(
    `SELECT state
     FROM orders 
     WHERE player_id = $1 and created_at > NOW() - INTERVAL '5 minutes'`,
    [playerId],
    'Failed to retrieve orders'
  );

  let shippedOrders = 0;
  let failedOrders = 0;

  for (const order of orders) {
    if (order.state === OrderStates.Canceled || order.state === OrderStates.Lost || order.state === OrderStates.Returned) {
      failedOrders++;
    } else if (order.state === OrderStates.Shipped) {
      shippedOrders++;
    }
  }

  const totalOrders = shippedOrders + failedOrders;
  const reputationScore = totalOrders > 0 ? (shippedOrders / totalOrders) * 100 : 100;

  const reputationData = {
    score: Math.round(reputationScore),
    shipped_orders: shippedOrders,
    failed_orders: failedOrders,
    total_orders: totalOrders,
    timestamp: currentTime
  };

  reputationCache[playerId] = reputationData;

  // store the score in the player.reputation field
  await dbRun(
    `UPDATE player
     SET reputation = $1
     WHERE id = $2`,
    [reputationData.score, playerId],
    'Failed to update player reputation'
  );

  return reputationData;
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

const increaseShippingSpeed = async (player) => {
  // console.log('Increasing shipping speed for player:', playerId);

  // if player's current shipping_speed is 1, do not decrease it further, instead increase the orders_per_ship
  if(player.shipping_speed <= 10) {
    const query = `UPDATE player SET shipping_speed=9, orders_per_ship = orders_per_ship + 1 WHERE id = $1 RETURNING orders_per_ship`;
    await dbRun(query, [player.id], 'Failed to increase products per order');
    console.log('Increased products per order');
  } else {
    const query = `UPDATE player SET shipping_speed = GREATEST(shipping_speed - $1, 100) WHERE id = $2 RETURNING shipping_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, player.id], 'Failed to increase shipping speed');
    console.log('Increased shipping speed');
  }
  return;
};

const increaseBuildingSpeed = async (player) => {
  // console.log('Increasing building speed for player:', playerId);

  // if player's current building_speed is 1, do not decrease it further, instead increase the products_per_build
  if(player.building_speed <= 10) {
    const query = `UPDATE player SET building_speed=9, products_per_build = products_per_build + 1 WHERE id = $1 RETURNING products_per_build`;
    await dbRun(query, [player.id], 'Failed to increase products per build');
  } else {
    const query = `UPDATE player SET building_speed = GREATEST(building_speed - $1, 100) WHERE id = $2 returning building_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, player.id], 'Failed to increase building speed');
  }
  return;
};

const increaseOrderSpawnRate = async (player) => {
  // console.log('Increasing order spawn rate for player:', playerId);

  // if player's current order_spawn_milliseconds is 1, do not decrease it further, instead increase the order_spawn_count
  if(player.order_spawn_milliseconds <= 100) {
    const query = `UPDATE player SET order_spawn_milliseconds=99, order_spawn_count = order_spawn_count + 1 WHERE id = $1 RETURNING order_spawn_count`;
    await dbRun(query, [player.id], 'Failed to increase order spawn points');
  } else {
    const query = `UPDATE player SET order_spawn_milliseconds = GREATEST(order_spawn_milliseconds - $1, 100) WHERE id = $2 returning order_spawn_milliseconds`;
    await dbRun(query, [SPEED_BOOST_FACTOR * 10, player.id], 'Failed to increase order spawn rate');
  }
}

const addSkillPoints = async (player, points) => {
  // console.log('Adding skill points for player:', playerId);
  console.log('Adding skill points:', points, ' for player:', player.name, ' (', player.id, ')');
  const query = `UPDATE player SET available_points = LEAST(available_points + $1, 999) WHERE id = $2`;
  await dbRun(query, [points, player.id], 'Failed to add skill points');
}

const gainXP = async (player, new_xp) => {
  // This now consumes XP points. When zero, gain skill points. 
  let xpToConsume = new_xp;
  let newTotalXP = player.xp - new_xp;
  if (newTotalXP < 0) {
    await addSkillPoints(player, 1);
    const totalPoints = player.points_spent + player.available_points - 3;
    const next_xp_requirement = calculateXPRequirement(totalPoints + 1);
    xpToConsume = Math.abs(newTotalXP);
    newTotalXP = next_xp_requirement - xpToConsume;
  }
 
  const query = `UPDATE player SET xp = $1 WHERE id = $2`;
  await dbRun(query, [newTotalXP, player.id], 'Failed to gain XP');
};

const calculateXPRequirement = (skillPoints) => {
  const BaseXP = 100; // Base XP value, adjust as needed
  // return Math.round(BaseXP * Math.pow(skillPoints, 1.2));
  
  // baseXp * 1.2 ^ (skillPoints - 1)
  return Math.min(5000000, Math.round(BASE_XP_FOR_SKILL_POINT * Math.pow(1.1, skillPoints)));
};

const upgradeSkill = async (playerId, skill) => {
  const player = await getPlayerInfo(playerId);
  if (player.available_points <= 0) {
    return { success: false, error: 'Not enough available points' };
  }
  let query;
  switch (skill) {
    case 'shipping_points':
      query = `UPDATE player SET points_spent = points_spent + 1, shipping_points = shipping_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseShippingSpeed(player);
      break;
    case 'building_points':
      query = `UPDATE player SET points_spent = points_spent + 1, building_points = building_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseBuildingSpeed(player);
      break;
    case 'order_spawn_points':
      query = `UPDATE player SET points_spent = points_spent + 1, order_spawn_points = order_spawn_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseOrderSpawnRate(player);
      break;
    default:
      console.log('Invalid skill:', skill);
      return { success: false, error: 'Invalid skill' };
  }

  console.log('upgradeSkill - playerId:', playerId, 'player.name:', player.name, 'skill:', skill);

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
  const reputationData = await CalculatePlayerReputation(player.id);
  const finalReputation = reputationData.score;
  // Set player to inactive and update final fields
  await dbRun(
    'UPDATE player SET active = false, final_money = $1, final_tech_level = $2, final_orders_shipped = $3, final_reputation = $4 WHERE id = $5',
    [finalMoney, finalTechLevel, finalOrdersShipped, finalReputation, player.id],
    'Failed to expire player'
  );
}

const toggleBuildingAutomation = async (playerId) => {
  console.log('Toggling building automation for player:', playerId);
  const player = await dbRun(
    'UPDATE player SET building_automation_enabled = NOT building_automation_enabled WHERE id = $1 RETURNING building_automation_enabled',
    [playerId],
    'Failed to update building automation status'
  );
  console.log('Building automation enabled:', player.rows[0].building_automation_enabled);

  return player.rows[0].building_automation_enabled;
};

module.exports = {
  getPlayerInfo,
  CreateNewPlayer,
  upgradeSkill,
  addSkillPoints,
  expirePlayer,
  updateLastGameUpdate,
  gainXP,
  toggleBuildingAutomation
};
