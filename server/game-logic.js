const { dbRun, dbGet, dbAll } = require('./database');
const fs = require('fs');
const path = require('path');

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
    await generateAvailableTechnology(playerId, initialTechLevel);
    await assignRandomProductToPlayer(playerId);
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
  const stepsPath = path.join(__dirname, 'shipping-steps.json');
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
    const availableTechIds = await dbAll(
      'SELECT techId FROM available_technologies WHERE playerId = ?',
      [playerId],
      'Failed to retrieve available technologies'
    );
    const acquiredTechIds = await dbAll(
      'SELECT techId FROM acquired_technologies WHERE playerId = ?',
      [playerId],
      'Failed to retrieve acquired technologies'
    );

    const excludedTechIds = [...availableTechIds, ...acquiredTechIds].map(tech => tech.techId);

    const newTech = await dbGet(
      `SELECT id FROM technologies 
       WHERE id NOT IN (${excludedTechIds.join(',')}) 
       ORDER BY RANDOM() LIMIT 1`,
      [],
      'Failed to retrieve new technology'
    );

    if (newTech) {
      await dbRun(
        'INSERT INTO available_technologies (playerId, techId) VALUES (?, ?)',
        [playerId, newTech.id],
        'Failed to insert new available technology'
      );
      console.log('New technology made available for playerId', playerId, ':', newTech.id);
    } else {
      console.log('No new technology available for playerId', playerId);
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { 
  generateInitialGameState, 
  generateAvailableTechnology, 
  calculateShippingAndBuyLabel, 
  playerHasTechnology,
  getShippingSteps,
  OrderCompleted,
  makeNewTechnologyAvailable // Export makeNewTechnologyAvailable
};