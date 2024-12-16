const { dbRun, dbGet, dbAll } = require('../database');
const { SPEED_BOOST_FACTOR, BASE_XP_FOR_SKILL_POINT, GAME_SHIPPING_COST_PER_MILE } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { OrderStates } = require('../constants');
const { generateProductDetailsWithOpenAI } = require('../open-ai');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000;

const CreateNewPlayer = async (name, businessName) => {

  const aiData = await generateProductDetailsWithOpenAI(businessName, name);

  businessName = aiData.suggested_business_name;
  
  const existingPlayer = await dbGet(
    'SELECT * FROM player WHERE business_name = $1',
    [businessName],
    'Failed to check existing player'
  );
  if (existingPlayer) {
    console.log('Failed to create player. Business name already exists:', existingPlayer.name, ' Player name = ', name);
    return;
  }

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
  const newProduct = await generateProductForPlayer(playerId, businessName, name, aiData);
  
  // CHEAT CODE SECTION HERE
  // If player name is Schmo, give them a head start (mostly for testing)
  // Worth noting I also excluded Schmo from the leaderboard queries
  if (name === 'Schmo') {
    await addSkillPoints({ id: playerId }, 25);
    // set money to 10000
    await dbRun(
      'UPDATE player SET money = 1000000 WHERE id = $1',
      [playerId],
      'Failed to update player money'
    );
  }

  const returnData = {
    player_id: playerId,
    business_name: businessName,
    product_name: aiData.product_name,
    product_description: aiData.product_description,
    product_category: aiData.product_category,
    business_description: aiData.suggested_business_description,
    product_emoji: aiData.emoji
  }
  return returnData;
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


// Get all player info and calculate some other useful bits. 
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
  let player = await dbGet(query, [playerId]);
  
  if(player) {
    const reputation = await CalculatePlayerReputation(playerId);
    player.reputation = reputation; 

    const { getBuildingSteps } = require('./product-logic');
    const { getShippingSteps, getShippingCostPerMile } = require('./shipping-logic');

    // get shipping and building steps and return count of steps and duration for each
    player.building_steps = await getBuildingSteps(playerId);
    player.building_duration = Math.round(player.building_steps.length * player.building_speed);
    //player.building_duration = player.building_speed;

    player.shipping_steps = await getShippingSteps(player.id);
    player.shipping_duration = Math.round(player.shipping_steps.length * player.shipping_speed);
    //player.shipping_duration = player.shipping_speed;

    player.shipping_cost_per_mile = await getShippingCostPerMile(player) || GAME_SHIPPING_COST_PER_MILE;

    const {calculateDistance} = require('./shipping-logic');
    player.shipping_distance = await calculateDistance(playerId);

    return player;
  } else {
    console.error('Failed to retrieve player info');
    return null;
  }
};

const increaseShippingSpeed = async (player) => {
  // console.log('Increasing shipping speed for player:', playerId);
  const shippingBlazingSpeedFactor = 100;
  // if player's current shipping_speed is 1, do not decrease it further, instead increase the orders_per_ship
  if(player.shipping_speed <= shippingBlazingSpeedFactor) {
    const query = `UPDATE player SET shipping_speed=$2, orders_per_ship = orders_per_ship + 1 WHERE id = $1 RETURNING orders_per_ship`;
    await dbRun(query, [player.id, shippingBlazingSpeedFactor], 'Failed to increase products per order');
  } else {
    const query = `UPDATE player SET shipping_speed = GREATEST(shipping_speed - $1, $3) WHERE id = $2 RETURNING shipping_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, player.id, shippingBlazingSpeedFactor], 'Failed to increase shipping speed');
  }
  return;
};


const increaseBuildingSpeed = async (player) => {
  // console.log('Increasing building speed for player:', playerId);
  const buildBlazingSpeedFactor = 100;

  // if player's current building_speed is 1, do not decrease it further, instead increase the products_per_build
  if(player.building_speed <= buildBlazingSpeedFactor) {
    const query = `UPDATE player SET building_speed=$2, products_per_build = products_per_build + 1 WHERE id = $1 RETURNING products_per_build`;
    await dbRun(query, [player.id, buildBlazingSpeedFactor], 'Failed to increase products per build');
  } else {
    const query = `UPDATE player SET building_speed = GREATEST(building_speed - $1, $3) WHERE id = $2 returning building_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, player.id, buildBlazingSpeedFactor], 'Failed to increase building speed');
  }
  return;
};

const increaseOrderSpawnRate = async (player) => {
  const orderSpawnBlazingSpeedFactor = 500;
  // if player's current order_spawn_milliseconds is 1, do not decrease it further, instead increase the order_spawn_count
  if(player.order_spawn_milliseconds <= orderSpawnBlazingSpeedFactor) {
    const query = `UPDATE player SET order_spawn_milliseconds=$2, order_spawn_count = order_spawn_count + 1 WHERE id = $1 RETURNING order_spawn_count`;
    await dbRun(query, [player.id, orderSpawnBlazingSpeedFactor], 'Failed to increase order spawn points');
  } else {
    const query = `UPDATE player SET order_spawn_milliseconds = GREATEST(order_spawn_milliseconds - $1, $3) WHERE id = $2 returning order_spawn_milliseconds`;
    await dbRun(query, [SPEED_BOOST_FACTOR * 10, player.id, orderSpawnBlazingSpeedFactor], 'Failed to increase order spawn rate');
  }
}

const addSkillPoints = async (player, points) => {
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

async function expirePlayer(player, reason = 'expired') {
  if(player.active === false) {
    return;
  }

  console.log(`Expiring player: ${player.id} - ${player.name} - ${player.business_name} for reason: ${reason}`);

  // Calculate final fields
  const finalMoney = player.money;
  const finalTechLevel = player.tech_level;
  const finalOrdersShipped = player.orders_shipped;
  const reputationData = await CalculatePlayerReputation(player.id);
  const finalReputation = reputationData.score;
  // Set player to inactive and update final fields
  await dbRun(
    'UPDATE player SET active = false, final_money = $1, final_tech_level = $2, final_orders_shipped = $3, final_reputation = $4, expiration_reason = $5 WHERE id = $6',
    [finalMoney, finalTechLevel, finalOrdersShipped, finalReputation, reason, player.id],
    'Failed to expire player'
  );
}

const toggleBuildingAutomation = async (playerId) => {
  const player = await dbRun(
    'UPDATE player SET building_automation_enabled = NOT building_automation_enabled WHERE id = $1 RETURNING building_automation_enabled',
    [playerId],
    'Failed to update building automation status'
  );
  console.log('Building automation enabled:', player.rows[0].building_automation_enabled);

  return player.rows[0].building_automation_enabled;
};

const generateProductForPlayer = async (playerId, businessName, name, aiData) => {
  // Copy values from product.id=1
  const result = await dbRun(
    `INSERT INTO products (name, description, category, emoji, weight, cost_to_build, sales_price, image_url)
     SELECT name, description, category, emoji, weight, cost_to_build, sales_price, image_url
     FROM products
     WHERE id = 1
     RETURNING id`,
    [],
    'Failed to create product'
  );

  const productId = result.rows[0].id;

  // Call OpenAI to generate product details
  let productData = aiData;

  productData.product_name = productData.product_name || 'Widget';
  productData.product_category = productData.product_category || 'Miscellaneous';
  productData.product_description = productData.product_description || 'A product that does something';
  productData.emoji = productData.emoji || '🚀';

  // log that a new player was created with name, businesname, and our gpt generated product details
  console.log('Created new player with name:', name, 'businessName:', businessName)
  console.log('AI Generated Data:', productData);

  // Update product with generated details
  await dbRun(
    `UPDATE products
     SET name = $1, category = $2, description = $3, emoji = $4
     WHERE id = $5`,
    [productData.product_name, productData.product_category, productData.product_description, productData.emoji, productId],
    'Failed to update product with generated details'
  );

  // Insert into player_products
  await dbRun(
    `INSERT INTO player_products (player_id, product_id)
     VALUES ($1, $2)`,
    [playerId, productId],
    'Failed to insert into player_products'
  );

  await dbRun(
    'INSERT INTO inventory (player_id, product_id, on_hand) VALUES ($1, $2, $3)',
    [playerId, productId, 0],
    'Failed to add initial stock to inventory'
  );

  return productId;
};

let networkDataCache = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 30 * 1000; // 30 seconds

const getNetworkData = async () => {
  const currentTime = Date.now();

  if (networkDataCache.data && (currentTime - networkDataCache.timestamp < CACHE_DURATION)) {
    return networkDataCache.data;
  }

  const query = `
    SELECT p.id, p.name, p.business_name, p.orders_shipped, 
           pr.emoji as product_emoji, pr.name AS product_name, pr.category AS product_category, pr.description AS product_description,
           inv.on_hand AS inventory_on_hand,
           COALESCE(STRING_AGG(t.emoji, ' '), 'None') AS technology_emojis
    FROM player p
    JOIN player_products pp ON p.id = pp.player_id
    JOIN products pr ON pp.product_id = pr.id
    JOIN inventory inv ON p.id = inv.player_id AND pr.id = inv.product_id
    LEFT JOIN acquired_technologies at ON p.id = at.player_id
    LEFT JOIN technologies t ON at.tech_id = t.id
    WHERE p.active = true
    GROUP BY pr.emoji, p.id, pr.name, pr.category, pr.description, inv.on_hand
  `;
  const data = await dbAll(query, [], 'Failed to retrieve network data');

  networkDataCache = {
    data,
    timestamp: currentTime
  };

  return data;
};

module.exports = {
  getPlayerInfo,
  CreateNewPlayer,
  upgradeSkill,
  addSkillPoints,
  expirePlayer,
  updateLastGameUpdate,
  gainXP,
  toggleBuildingAutomation,
  generateProductForPlayer,
  getNetworkData,
};
