const getShippingStates = () => [
  'You are writing a love letter to the package...',
  'You are wrestling with the packing tape like it\'s a wild animal...',
  'You are folding the box like it\'s an origami masterpiece...',
  'You are Googling "how to stick a label on a box" for the tenth time...',
  'You are taking a coffee break and spilling it all over the place...',
  'You are testing the box by sitting on it... and it\'s not going well...',
];

const BASE_SHIPPING_DURATION = 5; // Base shipping duration in seconds

module.exports = { getShippingStates, BASE_SHIPPING_DURATION };