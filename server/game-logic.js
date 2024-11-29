const { dbRun, dbGet, dbAll } = require('./database');

const generateInitialGameState = async (name, businessName, email, apiKey, apiSecret) => {
  const initialProgress = 0;
  const initialIsShipping = 0;
  const initialMoney = 0;
  const initialTechPoints = 0;
  const initialTechLevel = 1;
  const initialOrdersShipped = 0;
  const initialTotalMoneyEarned = 0;

  try {
    const result = await dbRun(
      'INSERT INTO player (name, businessName, email, apiKey, apiSecret, progress, isShipping, money, techPoints, techLevel, ordersShipped, totalMoneyEarned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, businessName, email, apiKey, apiSecret, initialProgress, initialIsShipping, initialMoney, initialTechPoints, initialTechLevel, initialOrdersShipped, initialTotalMoneyEarned],
      'Failed to create account'
    );
    const playerId = result.lastID;
    await generateAvailableTechnology(playerId, initialTechLevel);
    return playerId;
  } catch (err) {
    throw new Error(err.message);
  }
};

const generateAvailableTechnology = async (playerId, techLevel) => {
  try {
    const technologies = await dbAll(
      'SELECT id, name FROM technologies WHERE techLevelRequired = ? ORDER BY RANDOM() LIMIT 3',
      [techLevel],
      'Failed to retrieve technologies'
    );

    const techIds = technologies.map(tech => tech.id);
    await dbRun(
      'INSERT INTO available_technologies (playerId, techId) VALUES (?, ?), (?, ?), (?, ?)',
      [playerId, techIds[0], playerId, techIds[1], playerId, techIds[2]],
      'Failed to insert available technologies'
    );

    console.log('Available technologies for playerId', playerId, ':', technologies.map(tech => tech.name).join(', '));
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { generateInitialGameState, generateAvailableTechnology };