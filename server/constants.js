// TODO: move these to a database table and query/cache them
const BASE_ORDER_DUE_SECONDS = 2 * 60;
const MAXIMUM_ORDER_QUEUE_SIZE = 50;

const GAME_TIME_LIMIT_SECONDS = 15 * 60;
const GAME_DEBT_LIMIT = -1000000; // a player can go 1 million in debt before failing. 
const GAME_SHIPPING_COST_PER_MILE = 0.7; // $0-$700

const GAME_MIN_SHIPPING_DISTANCE = 5;
const GAME_MAX_SHIPPING_DISTANCE = 550;

const SPEED_BOOST_FACTOR = 150;

const XP_GAINED_PER_OPERATION = 10;
const BASE_XP_FOR_SKILL_POINT = 70;

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
  GAME_DEBT_LIMIT,
  GAME_SHIPPING_COST_PER_MILE,
  GAME_MIN_SHIPPING_DISTANCE,
  GAME_MAX_SHIPPING_DISTANCE,
  SPEED_BOOST_FACTOR,
  XP_GAINED_PER_OPERATION,
  BASE_XP_FOR_SKILL_POINT
};