const { dbAll, dbRun, dbGet } = require('../database');
const { BASE_INITIAL_MONEY, BASE_PRODUCTS_PER_ORDER, BASE_PRODUCTS_PER_BUILD } = require('../constants');
const { initializeTechTree } = require('./technology-logic');
const { assignRandomProductToPlayer } = require('./product-logic');

const getPlayerInfo = async (playerId) => {
  const query = `SELECT *, money, (strftime('%s', 'now') - strftime('%s', createdAt)) AS elapsedTime
                  FROM player 
                  WHERE id = ?`;
  try {
    const row = await dbGet(query, [playerId]);
    return row; // Assuming playerId is unique and returns a single row
  } catch (err) {
    throw new Error(err.message);
  }
};

const CreateNewPlayer = async (name, businessName) => {
  const initialProgress = 0;
  const initialIsShipping = 0;
  const initialMoney = BASE_INITIAL_MONEY;
  const initialTechPoints = 0;
  const initialTechLevel = 1;
  const initialOrdersShipped = 0;
  const initialTotalMoneyEarned = 0;
  const productsPerOrder = BASE_PRODUCTS_PER_ORDER;
  const productsPerBuild = BASE_PRODUCTS_PER_BUILD;

  console.log('Setting money to BASE_INITIAL_MONEY:', initialMoney);

  try {
    const result = await dbRun(
      'INSERT INTO player (name, businessName, progress, isShipping, money, techPoints, techLevel, ordersShipped, totalMoneyEarned, productsPerOrder, productsPerBuild) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, businessName, initialProgress, initialIsShipping, initialMoney, initialTechPoints, initialTechLevel, initialOrdersShipped, initialTotalMoneyEarned, productsPerOrder, productsPerBuild],
      'Failed to create account'
    );
    const playerId = result.lastID;
    await initializeTechTree(playerId);
    await assignRandomProductToPlayer(playerId);
    return playerId;
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = {
  getPlayerInfo,
  CreateNewPlayer
};
