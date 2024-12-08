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

  const actionSuccessful = await performOneTimeTechnologyEffect(playerId, technology.tech_code);
  if (!actionSuccessful) {
    return { success: false, message: 'Failed to perform technology effect.' };
  }

  await dbRun(
    `INSERT INTO acquired_technologies 
      (player_id, tech_id, acquired_date, acquired_cost) 
      VALUES 
      ($1, $2, NOW(), $3)`, // Corrected parameter index
    [playerId, techId, technology.cost], // Corrected parameter list
    'Failed to purchase technology'
  );
  
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
  console.log(`Performing effect for technology: ${techCode}`);

  switch (techCode) {
    case 'exclusive_logistics':
      // apply the exclusive_logistics_penalty_applied to all other active players
      await dbRun(
        `UPDATE player SET exclusive_logistics_penalty_applied = $1 WHERE id != $2 and active=true`,
        [true, playerId],
        'Failed to apply exclusive logistics penalty'
      );
      return true;
    case 'hostile_takeover':
      return hostileTakeoverAction(playerId);
    default:
      console.log(`No effect defined for technology: ${techCode}`);
      return true;
  }
};

const hostileTakeoverAction = async (playerId) => {

  // select up to 100 active players
  const players = await dbAll(
    'SELECT id FROM player WHERE id != $1 AND active=true LIMIT 100',
    [playerId],
    'Failed to retrieve active players'
  );
  // choose one at random
  const targetPlayerId = players[Math.floor(Math.random() * players.length)].id;

  if(!targetPlayerId || targetPlayerId === 1) {
    console.log('No target player found for hostile takeover.');
    return false;
  }
  console.log(`Player ${playerId} is taking over player ${targetPlayerId}`);

  const { getPlayerInfo } = require('./player-logic');
  const targetPlayer = await getPlayerInfo(targetPlayerId);
  const sourcePlayer = await getPlayerInfo(playerId);
  // expire that player with reason hostile_takeover_by_another_player
  const { expirePlayer } = require('./player-logic');
  await expirePlayer(targetPlayer, 'hostile_takeover_by_another_player');

  // update the target player hostile_takeover_by_player_id
  await dbRun(
    'UPDATE player SET hostile_takeover_player_name = $1, orders_shipped=0 WHERE id = $2',
    [sourcePlayer.name, targetPlayer.id],
    'Failed to update player hostile takeover by player id'
  );

  // add to our player's orders shipped the target player's orders shipped
  await dbRun(
    'UPDATE player SET orders_shipped = orders_shipped + $1, money = money - $3 WHERE id = $2',
    [targetPlayer.orders_shipped, playerId, targetPlayer.money],
    'Failed to update player orders shipped'
  );

  // make a big bold console log 3 lines deep that lets us know someone did this huge action
  console.log(` `);
  console.log(`!!!  Player ${playerId} has taken over player ${targetPlayer.id}  !!!`);
  console.log(` `);
  return true;
}

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