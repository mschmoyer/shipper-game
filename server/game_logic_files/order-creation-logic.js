const { businessHasTechnology } = require('./technology-logic');
const { BASE_ORDER_DUE_SECONDS, OrderStates } = require('../constants');
const { dbGet, dbRun } = require('../database');

const calculateDistance2 = async (businessId) => {
    const hasMultiWarehouseTech = await businessHasTechnology(businessId, 'multi_warehouse');
    let shippingDistance = 300;
    if (hasMultiWarehouseTech) {
      shippingDistance = shippingDistance / 2;
    }
    return shippingDistance;
}
 
const CreateOrder = async (business, allProducts, ghost = false) => {

    const distance = await calculateDistance2(business.id);

    const due_by_time_seconds = BASE_ORDER_DUE_SECONDS;

    let order = [];
    if(!ghost) {
        order = await dbGet(
            `INSERT INTO orders (business_id, due_by_time, state, distance, product_quantity) 
            VALUES 
            ($1, NOW() + INTERVAL '1 second' * $2, $3, $4, $5)
            RETURNING *`,
            [business.id, due_by_time_seconds, OrderStates.AwaitingShipment, distance, business.products_per_order],
            'Failed to generate order'
        );
    }

    const copData = await CreateOrderProducts(business, allProducts, order, ghost);
    return {
        newOrders: 1,
        totalCost: copData.totalCost,
        totalRevenue: copData.totalRevenue,
        inventoryToDeduct: copData.inventoryToDeduct
    };
};

const CreateOrderProducts = async (business, allProducts, order, ghost=false) => {

    let maxAllProductsIndex = 0;
    if( business.total_money_earned > (allProducts[1].cost_to_build * 10)) {
        // orders can now include allProducts[1]
        maxAllProductsIndex = 1;
    }
    if (business.total_money_earned > (allProducts[2].cost_to_build * 10)) {
        // orders can now include allProducts[2]
        maxAllProductsIndex = 2;
    }
    const randomNumberOfProducts = Math.floor(Math.random() * 3) + 1;

    let totalCost = 0;
    let totalRevenue = 0;
    let inventoryToDeduct = [0, 0, 0];
    for(let i = 0; i < randomNumberOfProducts; i++) {
        const randomProductIndex = Math.floor(Math.random() * (maxAllProductsIndex + 1));

        if(!ghost) {
            await CreateOrderProduct(order.id, allProducts[randomProductIndex].id, 1);
        }
        totalCost += allProducts[randomProductIndex].cost_to_build;
        totalRevenue += allProducts[randomProductIndex].sales_price;
        inventoryToDeduct[randomProductIndex]++;
    }
    return { totalCost, totalRevenue, inventoryToDeduct };
}

const CreateOrderProduct = async (orderId, productId, quantity) => {
    await dbRun(
        `INSERT INTO order_products (order_id, product_id, quantity)
        VALUES ($1, $2, $3)`,
        [orderId, productId, quantity],
        'Failed to create order product'
    );
};

module.exports = { 
    CreateOrder 
};