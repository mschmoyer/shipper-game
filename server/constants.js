const BASE_SHIPPING_DURATION = 5;
const BASE_QUANTITY_TO_BUILD = 3;
const BASE_INITIAL_MONEY = 500;
const BASE_ORDER_ARRIVAL_SECONDS = 15;
const MAXIMUM_ORDER_QUEUE_SIZE = 50;

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
  BASE_QUANTITY_TO_BUILD, 
  BASE_INITIAL_MONEY,
  BASE_ORDER_ARRIVAL_SECONDS,
  MAXIMUM_ORDER_QUEUE_SIZE
};