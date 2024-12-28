const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');
const { getBusinessInfo } = require('./business-logic');
const { businessHasTechnology } = require('./technology-logic');
const { XP_GAINED_PER_OPERATION } = require('../constants');
const { gainXP } = require('./skill-logic');

const DEFAULT_BUILDING_STEPS = [
  {
    "step_code": "gathering_components",
    "name": "Gathering Components"
  },
  {
    "step_code": "assembling",
    "name": "Assembling"
  },
  {
    "step_code": "creating_purchase_order",
    "name": "Creating Purchase Order"
  },
  {
    "step_code": "shipping_new_stock",
    "name": "Shipping New Stock"
  },
  {
    "step_code": "adding_stock_to_shelf",
    "name": "Adding Stock to Shelf"
  }
];

const productTick = async (business, allProducts, elapsed_time) => {

  const products_to_build = Math.floor(elapsed_time / business.building_duration);

  // check if business has technology hire_fabricator
  const hasHireFabricator = await businessHasTechnology(business.id, 'hire_fabricator');

  // The business could be building so fast that products could get build in between the 1 second game tick. Simulate this time gap. 
  let totalProductsBuilt = 0;
  if(products_to_build > 0 && hasHireFabricator && business.building_automation_enabled) {
    // for each allProducts, synthesize the built products
    // for (const loop_product of allProducts) {
    //   totalProductsBuilt += await _synthesizeBuiltProducts(business, loop_product, products_to_build);
    // }

    // TODO: for now, only automate the cheapest product. 
    totalProductsBuilt += await _synthesizeBuiltProducts(business, allProducts[0], products_to_build);
  }

  const activeProducts = await getActiveProducts(business);

  for (const product of activeProducts) {
    totalProductsBuilt += await CheckProductState(product, business.id);
  }

  if (totalProductsBuilt > 0) {
    await gainXP(business, totalProductsBuilt * XP_GAINED_PER_OPERATION);

    // update business products_built
    await dbRun(
      'UPDATE business SET products_built = products_built + $1 WHERE id = $2',
      [totalProductsBuilt, business.id],
      'Failed to update business products_built'
    );
  }

  if(hasHireFabricator && !allProducts[0].active) {
    console.log('productTick - business automated and no build. Starting product build');
    await startProductBuild(business.id);
  }
  
  return totalProductsBuilt;
};

const CheckProductState = async (product, businessId) => {
  if (!product || !product.active || product.start_time === null || product.elapsed_time === null) {
    return 0;
  }
  let totalProductsBuilt = 0;
  const elapsedTime = product.elapsed_time;
  if (elapsedTime >= product.duration || product.start_time === null) {
    totalProductsBuilt += await ProductCompleted(product.id, businessId);
  }
  return totalProductsBuilt;
}

const _synthesizeBuiltProducts = async (business, product, products_to_build) => {
  if(products_to_build <= 0) {
    return 0;
  }

  let money = business.money;
  let totalProducts = 0;
  let totalCost = 0;

  // loop for each product to build. if there is enough money and remaining stock, incremeent the products_built counter
  for (let i = 0; i < products_to_build; i++) {
    const cost_to_build = product.cost_to_build * product.quantity_per_build;

    // NOTE: i'm letting people go negative...
    money -= cost_to_build;
    totalProducts += product.quantity_per_build;
    totalCost += cost_to_build;
  }

  if (totalProducts > 0) {  
    // update the business's money
    updated_money = await dbRun(
      'UPDATE business SET money = GREATEST(money - $1,-2147483647) WHERE id = $2 RETURNING money',
      [totalCost, business.id],
      'Failed to update business money'
    );

    // update inventory
    updated_on_hand = await dbRun(
      `UPDATE products SET on_hand = LEAST(on_hand + $1, 2147483647) 
      WHERE business_id = $2 and id = $3 RETURNING on_hand`,
      [totalProducts, business.id, product.id],
      'Failed to update inventory'
    );
  }

  console.log('_synthesizeBuiltProducts - productsToBuild:', products_to_build, 'productsBuilt:', totalProducts, 'costed:', totalCost, 'business.products_per_build:', business.products_per_build);
  return totalProducts;
}

const getActiveProducts = async (business) => {
  let products = await dbAll(
    `SELECT p.*,
        EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time,
        NOW() as current_time
      FROM products p
      WHERE p.business_id = $1
      ORDER BY id ASC`,
    [business.id],
    'Failed to retrieve products info'
  );

  const hasBundlesTech = await businessHasTechnology(business.id, 'bundles');
  for (const product of products) {    
    if(hasBundlesTech) {
      product.sales_price = product.sales_price * (hasBundlesTech ? hasBundlesTech : 1);
    }

    const progress = product.start_time ? Math.min((product.elapsed_time / product.duration) * 100, 100) : 100;
    const is_building = product.start_time ? progress < 100 : false;

    product.progress = progress;
    product.is_building = is_building;
  }
  return products;
};

const getActiveProduct = async (business) => {
  const businessId = business.id;
  const product = await dbGet(
    `SELECT p.*,
        EXTRACT(EPOCH FROM (NOW() - start_time))*1000 AS elapsed_time
      FROM products p 
      WHERE p.business_id = $1
      ORDER BY id ASC
      LIMIT 1`,
    [businessId],
    'Failed to retrieve product info'
  );

  if(!product) {
    console.error('getActiveProduct - no product found for business:', businessId);
    return { error: 'No product found' };
  }

  const hasBundlesTech = await businessHasTechnology(businessId, 'bundles');
  if(hasBundlesTech) {
    product.sales_price = product.sales_price * (hasBundlesTech ? hasBundlesTech : 1);
  }
  
  //product.building_steps = building_steps;
  product.building_duration = business.building_duration;

  const start_time = product.start_time ? new Date(product.start_time) : null;
  const elapsed_time = product.elapsed_time ? product.elapsed_time : 0;
  const progress = start_time ? Math.min((elapsed_time / product.duration) * 100, 100) : 100;
  const is_building = start_time ? progress < 100 : false;

  product.progress = progress;
  product.is_building = is_building;
  product.start_time = start_time;
  product.elapsed_time = elapsed_time/1000;

   return product;
};

const getBuildingSteps = async (businessId) => {
  if (!businessId) {
    console.error('getBuildingSteps - business parameter missing!');
    return { error: 'business not found' };
  }
  building_steps = DEFAULT_BUILDING_STEPS.map(step => ({ ...step }));
  return building_steps;
};

const ProductCompleted = async (productId, businessId) => {
  const data = await dbRun(
    `UPDATE products SET 
        active = false, 
        on_hand = on_hand + quantity_per_build 
      WHERE business_id = $1 AND id = $2
      RETURNING quantity_per_build`,
    [businessId, productId],
    'Failed to update product upon completion'
  );
  return data.rows[0].quantity_per_build;
};

const startProductBuild = async (businessId, productId) => {
  const business = await getBusinessInfo(businessId);

  const activeProduct = await dbGet(
    `SELECT * FROM products WHERE id = $1 AND business_id = $2`,
    [productId, businessId],
    'Failed to retrieve product info'
  );

  if (!activeProduct) {
    return { error: 'Product not found' };
  }

  if (activeProduct.active) {
    const didFinishSome = await CheckProductState();
    if(!didFinishSome) {
      return { error: 'Product already building' };
    }
  }

  const quantity = business.products_per_build || 1;
  const totalBuildCost = activeProduct.cost_to_build * quantity;

  await dbRun(
    'UPDATE business SET money = money - $1 WHERE id = $2',
    [totalBuildCost, businessId],
    'Failed to deduct money from business'
  );

  const building_steps = await getBuildingSteps(businessId);

  // update product start_time, duration, active, and quantity_per_build
  await dbRun(
    `UPDATE products SET 
        start_time = NOW(), 
        duration = $1, 
        active = true, 
        quantity_per_build = $2 
      WHERE business_id = $3 AND id = $4`,
    [business.building_duration, quantity, businessId, activeProduct.id],
    'Failed to update product'
  );

  // const building_speed = Math.max(business.building_speed, 100);
  // let product_build_ms = (business.building_speed < 100 ? building_speed : (business.building_duration));
  // if (product_build_ms > 0) {
  //   await ProductCompleted(productId, businessId);
  // }

  return { 
    message: 'Product build started successfully.',
    building_duration: business.building_duration,
    building_steps,
    costToBuild: activeProduct.cost_to_build,
    quantity,
    totalCost: activeProduct.cost_to_build * quantity
  };
};

const UpdateInventoryCount = async (businessId, productId, quantity) => {
  await dbRun(
    `UPDATE products SET on_hand = on_hand + $1 WHERE business_id = $2 AND id = $3`,
    [quantity, businessId, productId],
    'Failed to update inventory'
  );
}

module.exports = {
  getActiveProduct,
  getActiveProducts,
  getBuildingSteps,
  startProductBuild,
  productTick,
  UpdateInventoryCount
};