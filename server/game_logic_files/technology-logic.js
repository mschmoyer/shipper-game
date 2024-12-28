const { dbRun, dbGet, dbAll } = require('../database');

let techCache = {};
const CACHE_EXPIRATION_TIME = 2000; // 2 seconds

const TechnologyTick = async (business) => {
  let money_to_deduct = 0;
  if( await businessHasTechnology(business.id, 'hire_warehouse_worker') ) {
    money_to_deduct += 20;
  }
  if( await businessHasTechnology(business.id, 'hire_fabricator') ) {
    money_to_deduct += 20;
  }
  // update the business's money
  await dbRun(
    'UPDATE business SET money = money - $1 WHERE id = $2',
    [money_to_deduct, business.id],
    'Failed to update business money'
  );
};

const businessHasTechnology = async (businessId, techCode) => {
  const cacheKey = `${businessId}-${techCode}`;
  const currentTime = Date.now();

  if (techCache[cacheKey] && (currentTime - techCache[cacheKey].timestamp < CACHE_EXPIRATION_TIME)) {
    return techCache[cacheKey].modifier_value;
  }

  const technology = await dbGet(
    `SELECT t.modifier_value 
    FROM acquired_technologies at 
    JOIN technologies t ON at.tech_id = t.id 
    WHERE at.business_id = $1 AND t.tech_code = $2`,
    [businessId, techCode],
    'Failed to check business technology'
  );

  techCache[cacheKey] = {
    modifier_value: technology ? technology.modifier_value : null,
    timestamp: currentTime
  };

  return techCache[cacheKey].modifier_value;
};

const makeNewTechnologyAvailable = async (businessId) => {
  const availableTechCodes = await dbAll(
    'SELECT t.tech_code FROM available_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.business_id = $1',
    [businessId],
    'Failed to retrieve available technologies'
  );
  const acquiredTechCodes = await dbAll(
    'SELECT t.tech_code FROM acquired_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.business_id = $1',
    [businessId],
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
      'INSERT INTO available_technologies (business_id, tech_id) VALUES ($1, $2)',
      [businessId, newTech.id],
      'Failed to insert new available technology'
    );
    return true;
  } else {
    console.log('No new technology available for businessId', businessId);
    return false;
  }
};

const getAvailableTechnologies = async (businessId) => {
  return await dbAll(
    'SELECT * FROM available_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.business_id = $1',
    [businessId],
    'Failed to retrieve available technologies'
  );
};

const getAcquiredTechnologies = async (businessId) => {
  return await dbAll(
    'SELECT * FROM acquired_technologies at JOIN technologies t ON at.tech_id = t.id WHERE at.business_id = $1',
    [businessId],
    'Failed to retrieve acquired technologies'
  );
};

const getAllTechnologyWithState = async (businessId) => {
  // Get all technologies and add a field for whether they are purchased by the business or not using acquired_technologies table
  return await dbAll(
    `SELECT t.*, at.id AS acquired_id FROM technologies t
    LEFT JOIN acquired_technologies at ON t.id = at.tech_id AND at.business_id = $1`,
    [businessId],
    'Failed to retrieve all technologies with state'
  );
};

const purchaseTechnology = async (businessId, techId) => {
  const business = await dbGet(
    'SELECT money FROM business WHERE id = $1',
    [businessId],
    'Failed to retrieve business money'
  );
  const technology = await dbGet(
    'SELECT tech_code, cost, acquirable FROM technologies WHERE id = $1',
    [techId],
    'Failed to retrieve technology info'
  );

  if (business.money < technology.cost) {
    return { success: false, message: 'Not enough money to purchase technology.' };
  }

  const actionSuccessful = await performOneTimeTechnologyEffect(businessId, technology.tech_code);
  if (!actionSuccessful) {
    return { success: false, message: 'Failed to perform technology effect.' };
  }

  await dbRun(
    `INSERT INTO acquired_technologies 
      (business_id, tech_id, acquired_date, acquired_cost) 
      VALUES 
      ($1, $2, NOW(), $3)`, // Corrected parameter index
    [businessId, techId, technology.cost], // Corrected parameter list
    'Failed to purchase technology'
  );
  
  await dbRun(
    'UPDATE business SET money = money - $1, tech_level = tech_level + 1 WHERE id = $2',
    [technology.cost, businessId],
    'Failed to update business money and tech level'
  );
  await dbRun(
    'DELETE FROM available_technologies WHERE business_id = $1 AND tech_id = $2',
    [businessId, techId],
    'Failed to remove technology from available technologies'
  );
  const newTechAdded = await makeNewTechnologyAvailable(businessId);
  return { success: true, message: 'Technology purchased successfully.', newTechAdded };
};

const performOneTimeTechnologyEffect = async (businessId, techCode) => {
  // fetch the technology information
  const technology = await dbGet(
    'SELECT * FROM technologies WHERE tech_code = $1',
    [techCode],
    'Failed to retrieve technology info'
  );
  console.log(`Performing effect for technology: ${techCode}`);

  switch (techCode) {
    case 'exclusive_logistics':
      // apply the exclusive_logistics_penalty_applied to all other active businesss
      await dbRun(
        `UPDATE business SET exclusive_logistics_penalty_applied = $1 WHERE id != $2 and active=true`,
        [true, businessId],
        'Failed to apply exclusive logistics penalty'
      );
      return true;
    case 'advertising_campaign':
      // set the advertising_campaign_start_time
      await dbRun(
        'UPDATE business SET advertising_campaign_start_time = NOW() WHERE id = $1',
        [businessId],
        'Failed to set advertising campaign start time'
      );
      return true;
    case 'hostile_takeover':
      return hostileTakeoverAction(businessId);
    default:
      console.log(`No effect defined for technology: ${techCode}`);
      return true;
  }
};

const hostileTakeoverAction = async (businessId) => {

  // select up to 100 active businesss
  const businesss = await dbAll(
    'SELECT id FROM business WHERE id != $1 AND active=true LIMIT 100',
    [businessId],
    'Failed to retrieve active businesss'
  );
  // choose one at random
  const targetBusinessId = businesss[Math.floor(Math.random() * businesss.length)].id;

  if(!targetBusinessId || targetBusinessId === 1) {
    console.log('No target business found for hostile takeover.');
    return false;
  }
  console.log(`business ${businessId} is taking over business ${targetBusinessId}`);

  const { getBusinessInfo } = require('./business-logic');
  const targetBusiness = await getBusinessInfo(targetBusinessId);
  const sourceBusiness = await getBusinessInfo(businessId);
  // expire that business with reason hostile_takeover_by_another_business
  const { expireBusiness } = require('./business-logic');
  await expireBusiness(targetBusiness, 'hostile_takeover_by_another_business');

  // update the target business hostile_takeover_by_business_id
  await dbRun(
    'UPDATE business SET hostile_takeover_business_name = $1, orders_shipped=0 WHERE id = $2',
    [sourceBusiness.name, targetBusiness.id],
    'Failed to update business hostile takeover by business id'
  );

  // add to our business's orders shipped the target business's orders shipped
  await dbRun(
    'UPDATE business SET orders_shipped = LEAST(orders_shipped + $1, 2147483647), money = LEAST(money - $3, 2147483647) WHERE id = $2',
    [targetBusiness.orders_shipped, businessId, targetBusiness.money],
    'Failed to update business orders shipped'
  );

  // make a big bold console log 3 lines deep that lets us know someone did this huge action
  console.log(` `);
  console.log(`!!!  business ${businessId} has taken over business ${targetBusiness.id}  !!!`);
  console.log(` `);
  return true;
}

const initializeTechTree = async (businessId, techLevel) => {
  for (let i = 0; i < 3; i++) {
    await makeNewTechnologyAvailable(businessId);
  }
  console.log('Initialized tech tree for businessId', businessId);
};

const isAdvertisingCampaignActive = async (business) => {
  const hasAdvertisingTech = await businessHasTechnology(business.id, 'advertising_campaign');
  if (hasAdvertisingTech && business.advertising_campaign_start_time) {
    const hasExpired = new Date() - business.advertising_campaign_start_time > 120000;
    if(hasExpired) {
      await dbRun(
        'UPDATE business SET advertising_campaign_start_time = NULL WHERE id = $1',
        [business.id],
        'Failed to cancel advertising campaign'
      );
      await dbRun(
        'DELETE FROM acquired_technologies WHERE business_id = $1 AND tech_code = $2',
        [business.id, 'advertising_campaign'],
        'Failed to remove advertising campaign from acquired technologies'
      );
      return false;
    }
    return true;
  }
  return false;
}


module.exports = {
  TechnologyTick,
  businessHasTechnology,
  makeNewTechnologyAvailable,
  performOneTimeTechnologyEffect,
  initializeTechTree,
  getAvailableTechnologies,
  getAcquiredTechnologies,
  purchaseTechnology,
  getAllTechnologyWithState,
  isAdvertisingCampaignActive
};