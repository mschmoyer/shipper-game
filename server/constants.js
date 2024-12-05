
// TODO: move these to a database table and query/cache them
const BASE_ORDER_DUE_SECONDS = 2 * 60;
const MAXIMUM_ORDER_QUEUE_SIZE = 50;
const GAME_TIME_LIMIT_SECONDS = 15 * 60;
const SPEED_BOOST_FACTOR = 100;

const XP_PER_OPERATION = 10;
const XP_FOR_SKILL_POINT = 100;

const OrderStates = Object.freeze({
  AwaitingShipment: 'AwaitingShipment',
  InProgress: 'InProgress',
  Shipped: 'Shipped',
  Canceled: 'Canceled',
  Lost: 'Lost',
  Returned: 'Returned'
});

module.exports = {  
  OrderStates,  
  BASE_ORDER_DUE_SECONDS,
  MAXIMUM_ORDER_QUEUE_SIZE,
  GAME_TIME_LIMIT_SECONDS,
  SPEED_BOOST_FACTOR,
  XP_PER_OPERATION,
  XP_FOR_SKILL_POINT
};