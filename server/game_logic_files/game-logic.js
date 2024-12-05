const { dbRun, dbGet } = require('../database');
const { GAME_TIME_LIMIT_SECONDS } = require('../constants');
const { productTick } = require('./product-logic');
const { OrderTick } = require('./shipping-logic');
const { CreateNewPlayer, expirePlayer, updateLastGameUpdate } = require('./player-logic');

const generateInitialGameState = async (name, businessName) => {
  console.log('User started a new game! Details:', { name, businessName });

  const playerId = await CreateNewPlayer(name, businessName);
  // console.log('Generated playerId in generateInitialGameState:', playerId);
  return playerId;
};

const gameTick = async (player, product, inventory) => {
  
  // define a const that compares player.last_game_update to current time
  const timeSinceLastUpdate = await updateLastGameUpdate(player.id, player.last_game_update);

  const timeRemainingSeconds = Math.max(GAME_TIME_LIMIT_SECONDS - player.elapsed_time, 0);

  if (timeRemainingSeconds <= 0) {
    await expirePlayer(player);
    return { orders: [], secondsUntilNextOrder: 0, timeRemainingSeconds };
  }

  // Do builds and product completions
  const productsBuilt = await productTick(player, product, inventory, timeSinceLastUpdate); 

  // Do order completions and new orders
  const { orders, secondsUntilNextOrder, ordersShipped } = await OrderTick(player, product, inventory, timeSinceLastUpdate);

  const data = { orders, secondsUntilNextOrder, timeRemainingSeconds, productsBuilt, ordersShipped };
  return data; 
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
  generateInitialGameState, 
  gameTick,
  productTick,
  handleTruckToWarehouseGameCompletion,
  handleFindTheProductHaystackGameCompletion
};