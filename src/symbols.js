export const symbols = [
  { id: 'seven', name: 'Seven', original: 'Seven' },
  { id: 'burger', name: 'Burger', original: 'Pineapple' },
  { id: 'fries', name: 'Fries', original: 'Banana' },
  { id: 'shake', name: 'Milkshake', original: 'Grapes' },
  { id: 'coffee', name: 'Coffee', original: 'Pear' },
  { id: 'cherries', name: 'Cherries', original: 'Cherry' },
  { id: 'pie', name: 'Cherry pie', original: 'Apple' },
  { id: 'sundae', name: 'Sundae', original: 'Strawberry' },
  { id: 'wild', name: 'Wild jukebox', original: 'Wild' },
  { id: 'dollar', name: 'Dollar', original: 'Dollar' },
  { id: 'star', name: 'Star', original: 'Star' },
];
export const symbolById = Object.fromEntries(symbols.map(s => [s.id, s]));
// Display layout only. Outcomes always come from the adapter.
export const idleGrid = [
  ['burger', 'cherries', 'seven', 'shake', 'coffee'],
  ['pie', 'wild', 'seven', 'fries', 'dollar'],
  ['sundae', 'burger', 'coffee', 'cherries', 'star'],
];
