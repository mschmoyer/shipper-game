const { dbRun, dbGet, dbAll } = require('./database');
const fs = require('fs');
const path = require('path');
const { OrderStates, BASE_INITIAL_MONEY, BASE_ORDER_ARRIVAL_SECONDS, MAXIMUM_ORDER_QUEUE_SIZE } = require('./constants');
const { assignRandomProductToPlayer, ProductCompleted, productTick } = require('./product-logic'); // Import from product-logic.js

const generateInitialGameState = async (name, businessName, email, apiKey, apiSecret) => {
  console.log('generateInitialGameState called with:', { name, businessName, email, apiKey, apiSecret }); // Debugging statement
  const initialProgress = 0;
  const initialIsShipping = 0;
  const initialMoney = BASE_INITIAL_MONEY;
  const initialTechPoints = 0;
  const initialTechLevel = 1;
  const initialOrdersShipped = 0;
  const initialTotalMoneyEarned = 0;

  try {
    const result = await dbRun(
      'INSERT INTO player (name, businessName, progress, isShipping, money, techPoints, techLevel, ordersShipped, totalMoneyEarned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, businessName, initialProgress, initialIsShipping, initialMoney, initialTechPoints, initialTechLevel, initialOrdersShipped, initialTotalMoneyEarned],
      'Failed to create account'
    );
    const playerId = result.lastID;
    console.log('Generated playerId in generateInitialGameState:', playerId); // Debugging statement
    await initializeTechTree(playerId, initialTechLevel);
    await assignRandomProductToPlayer(playerId);
    return playerId;
  } catch (err) {
    console.error('Error in generateInitialGameState:', err); // Debugging statement
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

// Remove assignRandomProductToPlayer function
// const assignRandomProductToPlayer = async (playerId) => {
//   // ...existing code...
// };

const calculateShippingAndBuyLabel = async (playerId, distance) => {
  try {
    const product = await dbGet(
      'SELECT p.weight, p.costToBuild, p.salesPrice FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
      [playerId],
      'Failed to retrieve product info'
    );

    const shippingCostPerMile = 0.05; // Cost per mile
    let shippingCost = distance * shippingCostPerMile;

    const discountedShippingModifier = await playerHasTechnology(playerId, 'discounted_shipping_rates');
    if (discountedShippingModifier) {
      console.log('Applying discounted shipping modifier:', discountedShippingModifier);
      shippingCost *= (1 - discountedShippingModifier); // Reduce shipping cost by the modifier value
    }

    const totalCost = Math.round(shippingCost + product.costToBuild);

    await dbRun(
      'UPDATE player SET money = money - ? WHERE id = ?',
      [Math.round(totalCost), playerId],
      'Failed to deduct shipping and production costs'
    );

    return { shippingCost: Math.round(shippingCost), salesPrice: Math.round(product.salesPrice) };
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
      'UPDATE orders SET state = ?, active = 0 WHERE id = ?',
      [OrderStates.Shipped, orderId],
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

const OrderCanceled = async (orderId, playerId) => {
  //console.log(`Order ${orderId} for player ${playerId} has been canceled.`);

  await dbRun(
    'UPDATE orders SET active=0, state = ? WHERE id = ?',
    [OrderStates.Canceled, orderId],
    'Failed to update order state to canceled'
  );
};

const gameTick = async (playerId) => {
  try {
    const currentTime = new Date();
    const activeOrders = await dbAll(
      'SELECT * FROM orders WHERE playerId = ? AND active = 1',
      [playerId],
      'Failed to retrieve active orders'
    );

    for (const order of activeOrders) {
      const startTime = new Date(order.startTime);
      const dueByTime = new Date(order.dueByTime);
      const elapsedTime = (currentTime - startTime) / 1000;

      if (order.state === OrderStates.InProgress && elapsedTime >= order.duration) {
        await OrderCompleted(order.id, playerId);
      } else if (currentTime > dueByTime) {
        await OrderCanceled(order.id, playerId);
      }
    }

    await productTick(playerId); 

    const lastOrder = await dbGet(
      'SELECT * FROM orders WHERE playerId = ? ORDER BY id DESC LIMIT 1',
      [playerId],
      'Failed to retrieve last order'
    );

    const newOrderInterval = BASE_ORDER_ARRIVAL_SECONDS;
    const maximumGeneratableOrders = MAXIMUM_ORDER_QUEUE_SIZE;
    const readyForNewOrder = (!lastOrder || (currentTime - new Date(lastOrder.startTime)) / 1000 >= newOrderInterval);

    if (activeOrders.length < maximumGeneratableOrders && readyForNewOrder) {
      await GenerateOrder(playerId);
    }

    const secondsUntilNextOrder = readyForNewOrder ? 0 : Math.max(0, newOrderInterval - (currentTime - new Date(lastOrder.startTime)) / 1000);
    return Math.round(secondsUntilNextOrder);
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
  const distance = Math.round(Math.random() * 1000); // Random distance in miles

  try {
    await dbRun(
      'INSERT INTO orders (playerId, startTime, duration, dueByTime, state, distance) VALUES (?, ?, ?, ?, ?, ?)',
      [playerId, startTime, duration, dueByTime, state, distance],
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

let reputationCache = {};
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 minute in milliseconds

const CalculatePlayerReputation = async (playerId) => {
  const currentTime = Date.now();

  if (reputationCache[playerId] && (currentTime - reputationCache[playerId].timestamp < CACHE_EXPIRATION_TIME)) {
    return reputationCache[playerId].score;
  }

  try {
    const orders = await dbAll(
      `SELECT state, dueByTime, startTime, duration 
       FROM orders 
       WHERE playerId = ? and createdAt > datetime('now', '-5 minutes')`,
      [playerId],
      'Failed to retrieve orders'
    );

    let positiveCount = 0;
    let negativeCount = 0;

    for (const order of orders) {
      const dueByTime = new Date(order.dueByTime);
      const endTime = new Date(new Date(order.startTime).getTime() + order.duration * 1000);

      if (order.state === OrderStates.Canceled) {
        negativeCount++;
      } else if (order.state === OrderStates.Shipped && endTime <= dueByTime) {
        positiveCount++;
      }
    }

    const totalOrders = positiveCount + negativeCount;
    const reputationScore = totalOrders > 0 ? (positiveCount / totalOrders) * 100 : 100;

    reputationCache[playerId] = {
      score: Math.round(reputationScore),
      timestamp: currentTime
    };

    return reputationCache[playerId].score;
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
  performOneTimeTechnologyEffect,
  GenerateOrder,
  gameTick, // Export gameTick
  OrderCanceled, // Export OrderCanceled
  CalculatePlayerReputation,
  productTick, // Export productTick
  ProductCompleted // Export ProductCompleted
};