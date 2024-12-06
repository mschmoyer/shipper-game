const { dbRun, dbGet, dbAll } = require('../database');

const playerHasTechnology = async (playerId, techCode) => {
  const technology = await dbGet(
    'SELECT t.modifier_value FROM acquired_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.player_id = $1 AND t.tech_code = $2',
    [playerId, techCode],
    'Failed to check player technology'
  );
  return technology ? technology.modifier_value : null;
};

const makeNewTechnologyAvailable = async (playerId) => {
  const availableTechCodes = await dbAll(
    'SELECT t.tech_code FROM available_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.player_id = $1',
    [playerId],
    'Failed to retrieve available technologies'
  );
  const acquiredTechCodes = await dbAll(
    'SELECT t.tech_code FROM acquired_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.player_id = $1',
    [playerId],
    'Failed to retrieve acquired technologies'
  );

  const excludedTechCodes = [...availableTechCodes, ...acquiredTechCodes].map(tech => tech.tech_code);

  let query = `SELECT id, tech_code, shipstation_kb_link FROM technologies`;
  if (excludedTechCodes.length > 0) {
    query += ` WHERE tech_code NOT IN (${excludedTechCodes.map(code => `'${code}'`).join(', ')})`;
  }
  query += ` LIMIT 1`;

  const newTech = await dbGet(
    query,
    [],
    'Failed to retrieve new technology'
  );

  if (newTech) {
    await dbRun(
      'INSERT INTO available_technologies (player_id, tech_id) VALUES ($1, $2)',
      [playerId, newTech.id],
      'Failed to insert new available technology'
    );
    return true;
  } else {
    console.log('No new technology available for playerId', playerId);
    return false;
  }
};

const getAvailableTechnologies = async (playerId) => {
  return await dbAll(
    'SELECT * FROM available_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.player_id = $1',
    [playerId],
    'Failed to retrieve available technologies'
  );
};

const getAcquiredTechnologies = async (playerId) => {
  return await dbAll(
    'SELECT * FROM acquired_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.player_id = $1',
    [playerId],
    'Failed to retrieve acquired technologies'
  );
};

const getAllTechnologyWithState = async (playerId) => {
  // Get all technologies and add a field for whether they are purchased by the player or not using acquired_technologies table
  return await dbAll(
    `SELECT t.*, at.id AS acquired_id FROM technologies t
    LEFT JOIN acquired_technologies at ON t.id = at.tech_id AND at.player_id = $1`,
    [playerId],
    'Failed to retrieve all technologies with state'
  );
};

const purchaseTechnology = async (playerId, techId) => {
  const player = await dbGet(
    'SELECT money FROM player WHERE id = $1',
    [playerId],
    'Failed to retrieve player money'
  );
  const technology = await dbGet(
    'SELECT tech_code, cost, acquirable FROM technologies WHERE id = $1',
    [techId],
    'Failed to retrieve technology info'
  );

  if (player.money < technology.cost) {
    return { success: false, message: 'Not enough money to purchase technology.' };
  }
  
  if (technology.acquirable) {
    await dbRun(
      `INSERT INTO acquired_technologies 
       (player_id, tech_id, acquired_date, acquired_cost) 
       VALUES 
       ($1, $2, NOW(), $3)`, // Corrected parameter index
      [playerId, techId, technology.cost], // Corrected parameter list
      'Failed to purchase technology'
    );
  } else {
    await performOneTimeTechnologyEffect(playerId, technology.tech_code);
  }
  await dbRun(
    'UPDATE player SET money = money - $1, tech_level = tech_level + 1 WHERE id = $2',
    [technology.cost, playerId],
    'Failed to update player money and tech level'
  );
  await dbRun(
    'DELETE FROM available_technologies WHERE player_id = $1 AND tech_id = $2',
    [playerId, techId],
    'Failed to remove technology from available technologies'
  );
  const newTechAdded = await makeNewTechnologyAvailable(playerId);
  return { success: true, message: 'Technology purchased successfully.', newTechAdded };
};

const performOneTimeTechnologyEffect = async (playerId, techCode) => {
  // fetch the technology information
  const technology = await dbGet(
    'SELECT * FROM technologies WHERE tech_code = $1',
    [techCode],
    'Failed to retrieve technology info'
  );

  switch (techCode) {
    case 'example_tech_code_2':
      console.log(`Performing effect for technology: ${techCode}`);
      break;
    // Add more cases as needed
    default:
      console.log(`No effect defined for technology: ${techCode}`);
  }
};

const initializeTechTree = async (playerId, techLevel) => {
  for (let i = 0; i < 3; i++) {
    await makeNewTechnologyAvailable(playerId);
  }
  console.log('Initialized tech tree for playerId', playerId);
};

module.exports = {
  playerHasTechnology,
  makeNewTechnologyAvailable,
  performOneTimeTechnologyEffect,
  initializeTechTree,
  getAvailableTechnologies,
  getAcquiredTechnologies,
  purchaseTechnology,
  getAllTechnologyWithState
};