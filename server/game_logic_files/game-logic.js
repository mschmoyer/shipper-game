const { dbRun, dbGet } = require('../database');

const { productTick } = require('./product-logic');
const { OrderTick } = require('./shipping-logic');
const { expirePlayer, updateLastGameUpdate } = require('./player-logic');

const { GAME_TIME_LIMIT_SECONDS, GAME_DEBT_LIMIT } = require('../constants');

// This is the main game loop. Called once per second on each client. 
const gameTick = async (player, product, inventory, active_order) => {
  
  const timeSinceLastUpdate = await updateLastGameUpdate(player.id, player.last_game_update);

  const secondsUntilGameExpired = Math.max(GAME_TIME_LIMIT_SECONDS - player.elapsed_time, 0);
  
  if (secondsUntilGameExpired <= 0) {
    console.log(`Player ${player.id} has run out of time.`);
    await expirePlayer(player, 'time_expired');
    return { game_status: 'time_expired', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };

  } else if (player.money < GAME_DEBT_LIMIT) {
    await expirePlayer(player, 'debt_limit_reached');
    return { game_status: 'debt_limit_reached', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };

  } else if (player.reputation.score <= 0) {
    await expirePlayer(player, 'reputation_too_low');
    return { game_status: 'reputation_too_low', orders: [], secondsUntilNextOrder: 0, secondsUntilGameExpired };
  } else {
    // Do builds and product completions
    const productsBuilt = await productTick(player, product, inventory, timeSinceLastUpdate); 

    // Do order completions and new orders
    const oData = await OrderTick(player, product, inventory, timeSinceLastUpdate, active_order);
    
    return { game_status: 'active', 
             orders: oData.orders, 
             secondsUntilNextOrder: oData.secondsUntilNextOrder, 
             timeRemainingSeconds: secondsUntilGameExpired,
             ordersShipped: oData.ordersShipped,
             productsBuilt
            };
  } 
};

const handleTruckToWarehouseGameCompletion = async (playerId, succeeded) => {
  if (succeeded) {
    // Handle success logic, e.g., reward player
    console.log(`Player ${playerId} succeeded in Truck to Warehouse game.`);
  } else {
    // Handle failure logic, e.g., penalize player
    console.log(`Player ${playerId} failed in Truck to Warehouse game.`);
    await dbRun(
      'UPDATE inventory SET on_hand = 0 WHERE player_id = $1',
      [playerId],
      'Failed to update stock level'
    );
  }
};

const handleFindTheProductHaystackGameCompletion = async (playerId, succeeded) => {
  if (succeeded) {
    // Handle success logic, e.g., reward player
    console.log(`Player ${playerId} succeeded in Find the Product Haystack game.`);
  } else {
    // Handle failure logic, e.g., penalize player
    console.log(`Player ${playerId} failed in Find the Product Haystack game.`);
    const player = await dbGet('SELECT money FROM player WHERE id = $1', [playerId], 'Failed to retrieve player money');
    const deduction = Math.min(1000, player.money);
    await dbRun(
      'UPDATE player SET money = money - $1 WHERE id = $2',
      [deduction, playerId],
      'Failed to update player money'
    );
  }
};

module.exports = {  
  gameTick,
  productTick,
  handleTruckToWarehouseGameCompletion,
  handleFindTheProductHaystackGameCompletion
};