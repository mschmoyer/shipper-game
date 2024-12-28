const { dbRun, dbGet } = require('../database');

const { productTick } = require('./product-logic');
const { OrderTick } = require('./shipping-logic');
const { expireBusiness, updateLastGameUpdate } = require('./business-logic');

const { GAME_TIME_LIMIT_SECONDS, GAME_DEBT_LIMIT } = require('../constants');
const { TechnologyTick } = require('./technology-logic');

// This is the main game loop. Called once per second on each client. 
const gameTick = async (business, allProducts, active_order) => {
  
  if(!business.active) {
    return { game_status: 'inactive', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired: 0 };
  }

  const timeSinceLastUpdate = await updateLastGameUpdate(business.id, business.last_game_update);

  const secondsUntilGameExpired = Math.max(GAME_TIME_LIMIT_SECONDS - business.elapsed_time, 0);
  
  if (secondsUntilGameExpired <= 0 && business.name !== 'Schmo') {
    console.log(`business ${business.id} has run out of time.`);
    await expireBusiness(business, 'time_expired');
    return { game_status: 'time_expired', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };

  } else if (business.money < GAME_DEBT_LIMIT) {
    await expireBusiness(business, 'debt_limit_reached');
    return { game_status: 'debt_limit_reached', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };

  } else if (business.reputation.score <= 0 && business.name !== 'Schmo') {
    await expireBusiness(business, 'reputation_too_low');
    return { game_status: 'reputation_too_low', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };
  } else {
    // Do builds and product completions
    const productsBuilt = await productTick(business, allProducts, timeSinceLastUpdate); 

    // Do order completions and new orders
    const oData = await OrderTick(business, allProducts, timeSinceLastUpdate, active_order);

    await TechnologyTick(business);
    
    return { game_status: 'active', 
             orders: oData.orders, 
             secondsUntilNextOrder: oData.secondsUntilNextOrder, 
             timeRemainingSeconds: secondsUntilGameExpired,
             ordersShipped: oData.ordersShipped,
             productsBuilt
            };
  } 
};

const handleTruckToWarehouseGameCompletion = async (businessId, succeeded) => {
  if (!succeeded) {
    // await dbRun(
    //   'UPDATE inventory SET on_hand = 0 WHERE business_id = $1',
    //   [businessId],
    //   'Failed to update stock level'
    // );
  }
};

const handleFindTheProductHaystackGameCompletion = async (businessId, succeeded) => {
  if (!succeeded) {
    // Handle failure logic, e.g., penalize business
    const business = await dbGet('SELECT money FROM business WHERE id = $1', [businessId], 'Failed to retrieve business money');
    const deduction = Math.min(1000, business.money);
    await dbRun(
      'UPDATE business SET money = money - $1 WHERE id = $2',
      [deduction, businessId],
      'Failed to update business money'
    );
  }
};

module.exports = {  
  gameTick,
  productTick,
  handleTruckToWarehouseGameCompletion,
  handleFindTheProductHaystackGameCompletion
};