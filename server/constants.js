const BASE_SHIPPING_DURATION = 5;
const BASE_INITIAL_MONEY = 50000;
const BASE_ORDER_ARRIVAL_SECONDS = 15;

const BASE_PRODUCTS_PER_ORDER = 1;
const BASE_PRODUCTS_PER_BUILD = 3;

const MAXIMUM_ORDER_QUEUE_SIZE = 50;
const GAME_TIME_LIMIT_SECONDS = 15 * 60;

const OrderStates = Object.freeze({
  AwaitingShipment: 'AwaitingShipment',
  InProgress: 'InProgress',
  Shipped: 'Shipped',
  Canceled: 'Canceled',
  Lost: 'Lost',
  Returned: 'Returned'
});

module.exports = {  
  BASE_SHIPPING_DURATION, 
  OrderStates,  
  BASE_INITIAL_MONEY,
  BASE_ORDER_ARRIVAL_SECONDS,
  MAXIMUM_ORDER_QUEUE_SIZE,
  GAME_TIME_LIMIT_SECONDS,
  BASE_PRODUCTS_PER_ORDER,
  BASE_PRODUCTS_PER_BUILD
};