const { dbRun, dbGet, dbAll } = require('./database');
const fs = require('fs');
const path = require('path');
const { OrderStates } = require('./constants');

const generateInitialGameState = async (name, businessName, email, apiKey, apiSecret) => {
  const initialProgress = 0;
  const initialIsShipping = 0;
  const initialMoney = 50;
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
    await initializeTechTree(playerId, initialTechLevel);
    await assignRandomProductToPlayer(playerId);
    return playerId;
  } catch (err) {
    throw new Error(err.message);
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

const assignRandomProductToPlayer = async (playerId) => {
  try {
    const products = await dbAll(
      'SELECT id FROM products ORDER BY RANDOM() LIMIT 1',
      [],
      'Failed to retrieve random product'
    );
    const productId = products[0].id;
    await dbRun(
      'INSERT INTO PlayerProducts (playerId, productId) VALUES (?, ?)',
      [playerId, productId],
      'Failed to assign product to player'
    );
    await dbRun(
      'INSERT INTO inventory (playerId, productId, onHand) VALUES (?, ?, ?)',
      [playerId, productId, 100],
      'Failed to add initial stock to inventory'
    );
  } catch (err) {
    throw new Error(err.message);
  }
};

const calculateShippingAndBuyLabel = async (playerId) => {
  try {
    const product = await dbGet(
      'SELECT p.weight, p.costToBuild, p.salesPrice FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
      [playerId],
      'Failed to retrieve product info'
    );

    const distance = Math.random() * 1000; // Random distance in miles
    const shippingCostPerMile = 0.05; // Cost per mile
    let shippingCost = distance * shippingCostPerMile;

    const discountedShippingModifier = await playerHasTechnology(playerId, 'discounted_shipping_rates');
    if (discountedShippingModifier) {
      shippingCost *= (1 - discountedShippingModifier); // Reduce shipping cost by the modifier value
    }

    const totalCost = Math.round(shippingCost + product.costToBuild);

    // const player = await dbGet(
    //   'SELECT money FROM player WHERE id = ?',
    //   [playerId],
    //   'Failed to retrieve player money'
    // );
    // if (player.money < totalCost) {
    //   throw new Error('Not enough money to cover shipping and production costs');
    // }

    await dbRun(
      'UPDATE player SET money = money - ? WHERE id = ?',
      [Math.round(totalCost), playerId],
      'Failed to deduct shipping and production costs'
    );

    return { shippingCost: Math.round(shippingCost), salesPrice: Math.round(product.salesPrice), distance: Math.round(distance) }; // Add distance to the return object
  } catch (err) {
    throw new Error(err.message);
  }
};

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

const getShippingSteps = async (playerId) => {
  const stepsPath = path.join(__dirname, 'game_data_files', 'shipping-steps.json');
  let steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

  // if user has the product_shipping_presets technology then eliminate the input_weights_dimensions step
  const hasPresetTech = await playerHasTechnology(playerId, 'product_shipping_presets');
  if (hasPresetTech) {
    steps = steps.filter(step => step.stepCode !== 'input_weights_dimensions');
  }

  const hasRateshopperTech = await playerHasTechnology(playerId, 'rate_shopper');
  if (hasRateshopperTech) {
    steps = steps.filter(step => step.stepCode !== 'rate_shopping');
  }

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  return { steps, totalDuration }; // Ensure return statement is always executed
};

const OrderCompleted = async (orderId, playerId) => {
  try {
    const product = await dbGet(
      'SELECT p.id, p.salesPrice FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
      [playerId],
      'Failed to retrieve product sales price'
    );
    let productValue = Math.round(product.salesPrice);

    const bundlesModifier = await playerHasTechnology(playerId, 'bundles');
    if (bundlesModifier) {
      productValue *= bundlesModifier; // Double the sales price if the player has the bundles technology
    }

    await dbRun(
      'UPDATE player SET money = money + ?, ordersShipped = ordersShipped + 1, totalMoneyEarned = totalMoneyEarned + ? WHERE id = ?',
      [productValue, productValue, playerId],
      'Failed to update money'
    );
    await dbRun(
      'UPDATE orders SET active = 0 WHERE id = ?',
      [orderId],
      'Failed to update order status'
    );

    // Deduct one stock from inventory
    await dbRun(
      'UPDATE inventory SET onHand = onHand - 1 WHERE playerId = ? AND productId = ?',
      [playerId, product.id],
      'Failed to deduct stock from inventory'
    );

    console.log('Order completed successfully. Updated money:', productValue);
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
      `SELECT id, techCode FROM technologies 
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

const performOneTimeTechnologyEffect = async (playerId, techCode) => {
  switch (techCode) {
    case 'example_tech_code_1':
      console.log(`Performing effect for technology: ${techCode}`);
      break;
    case 'example_tech_code_2':
      console.log(`Performing effect for technology: ${techCode}`);
      break;
    // Add more cases as needed
    default:
      console.log(`No effect defined for technology: ${techCode}`);
  }
};

const GenerateOrder = async (playerId) => {
  const startTime = new Date().toISOString();
  const dueByTime = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now
  const duration = 120; // 2 minutes in seconds
  const state = OrderStates.AwaitingShipment; // Use OrderStates enum

  try {
    await dbRun(
      'INSERT INTO orders (playerId, startTime, duration, dueByTime, state) VALUES (?, ?, ?, ?, ?)',
      [playerId, startTime, duration, dueByTime, state],
      'Failed to generate order'
    );

    const order = await dbGet(
      'SELECT * FROM orders WHERE playerId = ? ORDER BY id DESC LIMIT 1',
      [playerId],
      'Failed to retrieve generated order'
    );

    return order;
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { 
  generateInitialGameState, 
  initializeTechTree, 
  calculateShippingAndBuyLabel, 
  playerHasTechnology,
  getShippingSteps,
  OrderCompleted,
  makeNewTechnologyAvailable,
  performOneTimeTechnologyEffect, // Export performOneTimeTechnologyEffect
  GenerateOrder
};