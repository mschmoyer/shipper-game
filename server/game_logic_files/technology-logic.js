const { dbRun, dbGet, dbAll } = require('../database');

const playerHasTechnology = async (playerId, techCode) => {
  try {
    const technology = await dbGet(
      'SELECT t.modifierValue FROM acquired_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ? AND t.techCode = ?',
      [playerId, techCode],
      'Failed to check player technology'
    );
    return technology ? technology.modifierValue : null;
  } catch (err) {
    throw new Error(err.message);
  }
};

const makeNewTechnologyAvailable = async (playerId) => {
  try {
    const availableTechCodes = await dbAll(
      'SELECT t.techCode FROM available_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [playerId],
      'Failed to retrieve available technologies'
    );
    const acquiredTechCodes = await dbAll(
      'SELECT t.techCode FROM acquired_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [playerId],
      'Failed to retrieve acquired technologies'
    );

    const excludedTechCodes = [...availableTechCodes, ...acquiredTechCodes].map(tech => tech.techCode);
    console.log('Excluded Technology Codes for playerId', playerId, ':', excludedTechCodes);

    const newTech = await dbGet(
      `SELECT id, techCode, shipstation_kb_link FROM technologies 
       WHERE techCode NOT IN (${excludedTechCodes.map(code => `'${code}'`).join(',')}) 
       ORDER BY RANDOM() LIMIT 1`,
      [],
      'Failed to retrieve new technology'
    );
    console.log('New Technology for playerId', playerId, ':', newTech);

    if (newTech) {
      await dbRun(
        'INSERT INTO available_technologies (playerId, techId) VALUES (?, ?)',
        [playerId, newTech.id],
        'Failed to insert new available technology'
      );
      console.log('New technology made available for playerId', playerId, ':', newTech.id);
      return true;
    } else {
      console.log('No new technology available for playerId', playerId);
      return false;
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

const getAvailableTechnologies = async (playerId) => {
  return await dbAll(
    'SELECT * FROM available_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
    [playerId],
    'Failed to retrieve available technologies'
  );
};

const getAcquiredTechnologies = async (playerId) => {
  return await dbAll(
    'SELECT * FROM acquired_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
    [playerId],
    'Failed to retrieve acquired technologies'
  );
};

const purchaseTechnology = async (playerId, techId) => {
  const acquiredDate = new Date().toISOString();
  const player = await dbGet(
    'SELECT money FROM player WHERE id = ?',
    [playerId],
    'Failed to retrieve player money'
  );
  const technology = await dbGet(
    'SELECT techCode, cost, acquirable FROM technologies WHERE id = ?',
    [techId],
    'Failed to retrieve technology info'
  );

  if (player.money < technology.cost) {
    return { success: false, message: 'Not enough money to purchase technology.' };
  }
  
  if (technology.acquirable) {
    await dbRun(
      'INSERT INTO acquired_technologies (playerId, techId, acquiredDate, acquiredCost) VALUES (?, ?, ?, ?)',
      [playerId, techId, acquiredDate, technology.cost],
      'Failed to purchase technology'
    );
  } else {
    await performOneTimeTechnologyEffect(playerId, technology.techCode);
  }
  await dbRun(
    'UPDATE player SET money = money - ?, techLevel = techLevel + 1 WHERE id = ?',
    [technology.cost, playerId],
    'Failed to update player money and tech level'
  );
  await dbRun(
    'DELETE FROM available_technologies WHERE playerId = ? AND techId = ?',
    [playerId, techId],
    'Failed to remove technology from available technologies'
  );
  const newTechAdded = await makeNewTechnologyAvailable(playerId);
  return { success: true, message: 'Technology purchased successfully.', newTechAdded };
};

const performOneTimeTechnologyEffect = async (playerId, techCode) => {

  // fetch the technology information
  const technology = await dbGet(
    'SELECT * FROM technologies WHERE techCode = ?',
    [techCode],
    'Failed to retrieve technology info'
  );

  switch (techCode) {
    case 'bundles':
      
      // increase player productsPerOrder by the technology modifier value 
      await dbRun(
        'UPDATE player SET productsPerOrder = productsPerOrder + ? WHERE id = ?',
        [technology.modifierValue, playerId],
        'Failed to update player productsPerOrder'
      );

      break;
    case 'example_tech_code_2':
      console.log(`Performing effect for technology: ${techCode}`);
      break;
    // Add more cases as needed
    default:
      console.log(`No effect defined for technology: ${techCode}`);
  }
};

const initializeTechTree = async (playerId, techLevel) => {
  try {
    for (let i = 0; i < 3; i++) {
      await makeNewTechnologyAvailable(playerId);
    }
    console.log('Initialized tech tree for playerId', playerId);
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = {
  playerHasTechnology,
  makeNewTechnologyAvailable,
  performOneTimeTechnologyEffect,
  initializeTechTree,
  getAvailableTechnologies,
  getAcquiredTechnologies,
  purchaseTechnology
};