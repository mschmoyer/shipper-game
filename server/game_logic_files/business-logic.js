const { dbRun, dbGet, dbAll } = require('../database');
const { GAME_SHIPPING_COST_PER_MILE } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { OrderStates } = require('../constants');
const { generateProductDetailsWithOpenAI } = require('../open-ai');
const { addSkillPoints } = require('./skill-logic');

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000;

const CreateNewBusiness = async (name, businessName) => {

  const aiData = await generateProductDetailsWithOpenAI(businessName, name);
  businessName = aiData.suggested_business_name;
  
  const existingBusiness = await dbGet(
    'SELECT * FROM business WHERE business_name = $1',
    [businessName],
    'Failed to check existing business'
  );

  if (existingBusiness) {
    console.log('Failed to create business. Business name already exists:', existingBusiness.business_name, ' business name = ', businessName);
    return;
  }

  // insert a new business using the default values from business.id = 1
  const result = await dbRun(
    `INSERT INTO business (name, business_name, money, tech_points,
      tech_level, orders_shipped, total_money_earned, products_per_order, products_per_build,
      shipping_speed, building_speed, order_spawn_milliseconds, available_points, reputation, xp)
      SELECT $1, $2, money, tech_points, tech_level, orders_shipped, total_money_earned,
      products_per_order, products_per_build, shipping_speed, building_speed, order_spawn_milliseconds, 
      available_points, reputation, xp
      FROM business
      WHERE id = 1
      RETURNING id`,
    [name, businessName],
    'Failed to create account'
  );

  const businessId = result.rows[0].id;
  console.log('Created new business with id:', businessId);

  await initializeTechTree(businessId);
  
  // Generate 3 products. 
  await generateProductForBusiness(businessId, aiData.products[0].name, aiData.products[0].category, 
    aiData.products[0].description, aiData.products[0].emoji,
    0.4, 50, 450);
  await generateProductForBusiness(businessId, aiData.products[1].name, aiData.products[1].category, 
    aiData.products[1].description, aiData.products[1].emoji,
    1, 1000, 1800);
  await generateProductForBusiness(businessId, aiData.products[2].name, aiData.products[2].category,
     aiData.products[2].description, aiData.products[2].emoji,
     25, 10000, 20000);

  // CHEAT CODE SECTION HERE
  // If business name is Schmo, give them a head start (mostly for testing)
  // Worth noting I also excluded Schmo from the leaderboard queries
  if (name === 'Schmo') {
    await addSkillPoints({ id: businessId }, 300);
    // set money to 10000
    await dbRun(
      'UPDATE business SET money = 1000000 WHERE id = $1',
      [businessId],
      'Failed to update business money'
    );
  }

  console.log('aiData:', aiData);
  const returnData = {
    business_id: businessId,
    business_name: businessName,
    business_description: aiData.suggested_business_description,
    products: aiData.products
  }
  console.log('returnData:', returnData);
  return returnData;
};

// Calculate the business's reputation score based on their recent order history
// Cached for a short period of time to reduce database queries
// Reputation score is a percentage of successful orders out of total orders
const CalculateBusinessReputation = async (businessId) => {
  const currentTime = Date.now();

  if (reputationCache[businessId] && (currentTime - reputationCache[businessId].timestamp < CACHE_EXPIRATION_TIME)) {
    return reputationCache[businessId];
  }

  const orders = await dbAll(
    `SELECT state
     FROM orders 
     WHERE business_id = $1 and created_at > NOW() - INTERVAL '5 minutes'`,
    [businessId],
    'Failed to retrieve orders'
  );

  let shippedOrders = 50;
  let failedOrders = 25;

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
  reputationCache[businessId] = reputationData;

  // store the score in the business.reputation field
  await dbRun(
    `UPDATE business
     SET reputation = $1
     WHERE id = $2`,
    [reputationData.score, businessId],
    'Failed to update business reputation'
  );

  return reputationData;
};


// Get all business info and calculate some other useful bits. 
const getBusinessInfo = async (businessId) => {
  if (!businessId || businessId === 'null') {
    console.error('No businessId passed to getBusinessInfo');
    return null;
  }
  const query = `SELECT *, 
                  money, 
                  EXTRACT(EPOCH FROM (NOW() - created_at)) AS elapsed_time
                  FROM business 
                  WHERE id = $1`;
  let business = await dbGet(query, [businessId]);
  
  if(business) {
    const reputation = await CalculateBusinessReputation(businessId);
    business.reputation = reputation; 

    const { getBuildingSteps } = require('./product-logic');
    const { getShippingSteps, getShippingCostPerMile } = require('./shipping-logic');

    // get shipping and building steps and return count of steps and duration for each
    business.building_steps = await getBuildingSteps(businessId);
    business.building_duration = Math.round(business.building_steps.length * business.building_speed);
    business.shipping_steps = await getShippingSteps(business.id);
    business.shipping_duration = Math.round(business.shipping_steps.length * business.shipping_speed);

    business.shipping_cost_per_mile = await getShippingCostPerMile(business) || GAME_SHIPPING_COST_PER_MILE;

    const {calculateDistance} = require('./shipping-logic');
    business.shipping_distance = await calculateDistance(businessId);

    return business;
  } else {
    console.error('Failed to retrieve business info');
    return null;
  }
};

// update the last_game_update field in business
async function updateLastGameUpdate(businessId, last_game_update) {
  if(!last_game_update) {
    last_game_update = new Date();
  }
  const query = `UPDATE business 
                  SET last_game_update = NOW()
                  WHERE id = $2 
                  RETURNING last_game_update, EXTRACT(EPOCH FROM (NOW() - $1)) AS elapsed_time`;
                  
  // return elapsed time since last game update in milliseconds
  const row = await dbGet(query, [last_game_update, businessId], 'Failed to update last game update');
  const output_seconds = row.elapsed_time * 1000;
  return output_seconds;
}

async function expireBusiness(business, reason = 'expired') {
  if(business.active === false) {
    return;
  }

  console.log(`Expiring business: ${business.id} - ${business.name} - ${business.business_name} for reason: ${reason}`);

  const finalMoney = business.money;
  const finalTechLevel = business.tech_level;
  const finalOrdersShipped = business.orders_shipped;
  const reputationData = await CalculateBusinessReputation(business.id);
  const finalReputation = reputationData.score;
  // Set business to inactive and update final fields
  await dbRun(
    'UPDATE business SET active = false, final_money = $1, final_tech_level = $2, final_orders_shipped = $3, final_reputation = $4, expiration_reason = $5 WHERE id = $6',
    [finalMoney, finalTechLevel, finalOrdersShipped, finalReputation, reason, business.id],
    'Failed to expire business'
  );
}

const generateProductForBusiness = async (businessId, name, category, description, emoji, weight, cost, price) => {
  // Call OpenAI to generate product details
  name = name || 'Widget';
  category = category || 'Miscellaneous';
  description = description || 'A product that does something';
  emoji = emoji || '🚀';

  // log all of the new product details in one line
  console.log(`Generating product for business: ${businessId} - ${name} - ${category} - ${description} - ${emoji} - ${weight} - ${cost} - ${price}`);

  // Insert product with generated details
  await dbRun(
    `INSERT INTO products (business_id, name, category, description, emoji, weight, cost_to_build, sales_price, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [businessId, name, category, description, emoji, weight, cost, price, 0],
    'Failed to create product'
  );
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
           pr.emoji as product_emoji, pr.name AS product_name, pr.category AS product_category, 
           pr.description AS product_description, pr.on_hand AS inventory_on_hand,
           COALESCE(STRING_AGG(t.emoji, ' '), 'None') AS technology_emojis
    FROM business p
    JOIN products pr ON pr.business_id = p.id
    LEFT JOIN acquired_technologies at ON p.id = at.business_id
    LEFT JOIN technologies t ON at.tech_id = t.id
    WHERE p.active = true
    GROUP BY pr.emoji, p.id, pr.name, pr.category, pr.description, pr.on_hand
  `;
  const data = await dbAll(query, [], 'Failed to retrieve network data');

  networkDataCache = {
    data,
    timestamp: currentTime
  };

  return data;
};

module.exports = {
  getBusinessInfo,
  CreateNewBusiness,
  expireBusiness,
  updateLastGameUpdate,
  generateProductForBusiness,
  getNetworkData,
};
