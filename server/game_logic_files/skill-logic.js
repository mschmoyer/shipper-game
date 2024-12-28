const { dbRun } = require('../database');
const { BASE_XP_FOR_SKILL_POINT, SPEED_BOOST_FACTOR } = require('../constants');

const BLAZING_SPEED_FACTOR = 100;
const SPEED_BOOST_MULTIPLIER = 1.2;

const gainXP = async (business, new_xp) => {
    // This now consumes XP points. When zero, gain skill points. 
    let xpToConsume = new_xp;
    let newTotalXP = business.xp - new_xp;
    if (newTotalXP < 0) {
      await addSkillPoints(business, 1);
      const totalPoints = business.points_spent + business.available_points - 3;
      const next_xp_requirement = calculateXPRequirement(totalPoints + 1);
      xpToConsume = Math.abs(newTotalXP);
      newTotalXP = next_xp_requirement - xpToConsume;
    }
   
    const query = `UPDATE business SET xp = $1 WHERE id = $2`;
    await dbRun(query, [newTotalXP, business.id], 'Failed to gain XP');
  };
  
  const calculateXPRequirement = (skillPoints) => {
    const BaseXP = 100; // Base XP value, adjust as needed
    return Math.min(5000000, Math.round(BASE_XP_FOR_SKILL_POINT * Math.pow(1.1, skillPoints)));
  };

const increaseShippingSpeed = async (business) => {
  const shippingBlazingSpeedFactor = 100;
  // if business's current shipping_speed is 1, do not decrease it further, instead increase the orders_per_ship
  if(business.shipping_speed <= shippingBlazingSpeedFactor) {
    let newOrdersPerShip = Math.ceil(business.orders_per_ship * SPEED_BOOST_MULTIPLIER);
    newOrdersPerShip = (newOrdersPerShip === 1 ? 2 : newOrdersPerShip);
    const query = `UPDATE business SET shipping_speed=$2, orders_per_ship = $3 WHERE id = $1 RETURNING orders_per_ship`;
    await dbRun(query, [business.id, shippingBlazingSpeedFactor, newOrdersPerShip], 'Failed to increase products per order');
  } else {
    const query = `UPDATE business SET shipping_speed = GREATEST(shipping_speed - $1, $3) WHERE id = $2 RETURNING shipping_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, business.id, shippingBlazingSpeedFactor], 'Failed to increase shipping speed');
  }
  return;
};

const increaseBuildingSpeed = async (business) => {
  const buildBlazingSpeedFactor = 100;

  // if business's current building_speed is 1, do not decrease it further, instead increase the products_per_build
  if(business.building_speed <= buildBlazingSpeedFactor) {
    const newProductsPerBuild = Math.ceil(business.products_per_build * SPEED_BOOST_MULTIPLIER);
    const query = `UPDATE business SET building_speed=$2, products_per_build = $3 WHERE id = $1 RETURNING products_per_build`;
    await dbRun(query, [business.id, buildBlazingSpeedFactor, newProductsPerBuild], 'Failed to increase products per build');
  } else {
    const query = `UPDATE business SET building_speed = GREATEST(building_speed - $1, $3) WHERE id = $2 returning building_speed`;
    await dbRun(query, [SPEED_BOOST_FACTOR, business.id, buildBlazingSpeedFactor], 'Failed to increase building speed');
  }
  return;
};

const increaseOrderSpawnRate = async (business) => {
  const orderSpawnBlazingSpeedFactor = 500;
  // if business's current order_spawn_milliseconds is 1, do not decrease it further, instead increase the order_spawn_count
  if(business.order_spawn_milliseconds <= orderSpawnBlazingSpeedFactor) {
    let newOrderSpawnCount = Math.ceil(business.order_spawn_count * SPEED_BOOST_MULTIPLIER);
    newOrderSpawnCount = (newOrderSpawnCount === 1 ? 2 : newOrderSpawnCount);
    const query = `UPDATE business SET order_spawn_milliseconds=$2, order_spawn_count = $3 WHERE id = $1 RETURNING order_spawn_count`;
    await dbRun(query, [business.id, orderSpawnBlazingSpeedFactor, newOrderSpawnCount], 'Failed to increase order spawn points');
  } else {
    const query = `UPDATE business SET order_spawn_milliseconds = GREATEST(order_spawn_milliseconds - $1, $3) WHERE id = $2 returning order_spawn_milliseconds`;
    await dbRun(query, [SPEED_BOOST_FACTOR * 10, business.id, orderSpawnBlazingSpeedFactor], 'Failed to increase order spawn rate');
  }
}

const addSkillPoints = async (business, points) => {
  const query = `UPDATE business SET available_points = LEAST(available_points + $1, 999) WHERE id = $2`;
  await dbRun(query, [points, business.id], 'Failed to add skill points');
}

const upgradeSkill = async (businessId, skill) => {
  console.log('Upgrading skill:', skill);
  const { getBusinessInfo } = require('./business-logic');
  const business = await getBusinessInfo(businessId);
  if (business.available_points <= 0) {
    return { success: false, error: 'Not enough available points' };
  }
  let query;
  switch (skill) {
    case 'shipping_points':
      query = `UPDATE business SET points_spent = points_spent + 1, shipping_points = shipping_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseShippingSpeed(business);
      break;
    case 'building_points':
      query = `UPDATE business SET points_spent = points_spent + 1, building_points = building_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseBuildingSpeed(business);
      break;
    case 'order_spawn_points':
      query = `UPDATE business SET points_spent = points_spent + 1, order_spawn_points = order_spawn_points + 1, available_points = available_points - 1 WHERE id = $1`;
      increaseOrderSpawnRate(business);
      break;
    default:
      console.log('Invalid skill:', skill);
      return { success: false, error: 'Invalid skill' };
  }

  await dbRun(query, [businessId], 'Failed to upgrade skill');
  return { success: true };
};

module.exports = { 
    gainXP, 
    addSkillPoints, 
    upgradeSkill 
};