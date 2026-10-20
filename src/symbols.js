export const symbols = [
  { id: 'seven', nameKey: 'symbolSeven', original: 'Seven' },
  { id: 'burger', nameKey: 'symbolBurger', original: 'Pineapple' },
  { id: 'fries', nameKey: 'symbolFries', original: 'Banana' },
  { id: 'shake', nameKey: 'symbolShake', original: 'Grapes' },
  { id: 'coffee', nameKey: 'symbolCoffee', original: 'Pear' },
  { id: 'cherries', nameKey: 'symbolCherries', original: 'Cherry' },
  { id: 'pie', nameKey: 'symbolPie', original: 'Apple' },
  { id: 'sundae', nameKey: 'symbolSundae', original: 'Strawberry' },
  { id: 'wild', nameKey: 'symbolWild', original: 'Wild' },
  { id: 'dollar', nameKey: 'symbolDollar', original: 'Dollar' },
  { id: 'star', nameKey: 'symbolStar', original: 'Star' },
];
export const symbolById = Object.fromEntries(symbols.map(s => [s.id, s]));
// Display layout only. Outcomes always come from the adapter.
export const idleGrid = [
  ['burger', 'cherries', 'seven', 'shake', 'coffee'],
  ['pie', 'wild', 'seven', 'fries', 'dollar'],
  ['sundae', 'burger', 'coffee', 'cherries', 'star'],
];
