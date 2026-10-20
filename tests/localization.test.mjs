import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@vue/compiler-sfc';
import { parse as parseTemplate } from '@vue/compiler-dom';
import en from '../src/game/common/locales/en.json' with { type: 'json' };
import { t, createTranslator } from '../src/game/common/i18n.js';
import { reelLayout } from '../src/game/pixi/utils/reelLayout.js';
import { symbols } from '../src/game/common/symbols.js';

test('dictionary uses flat camelCase keys and parameterized outcomes', () => {
  for(const [key,value] of Object.entries(en)) { assert.match(key,/^[a-z][a-zA-Z0-9]*$/); assert.equal(typeof value,'string'); }
  assert.equal(t('spinWon',{amount:'2,00 EUR'}),'You have won 2,00 EUR');
  assert.equal(t('gameName'),'Neon Dinner');
  assert.equal(createTranslator({placeBet:'Test stake'})('placeBet'),'Test stake');
  assert.throws(()=>t('doesNotExist')); assert.throws(()=>t('spinWon'));
  for(const symbol of symbols) assert.ok(en[symbol.nameKey]);
});
test('Vue templates have no hardcoded visible words or accessibility labels', () => {
  const files=readdirSync('src',{recursive:true}).filter(f=>f.endsWith('.vue')).map(f=>'src/'+f);
  function visit(node,file) {
    if(node.type===2) assert.doesNotMatch(node.content,/[A-Za-z]/,`${file}: literal text ${node.content}`);
    for(const prop of node.props||[]) if(prop.type===6 && ['aria-label','title','placeholder','alt'].includes(prop.name)) assert.fail(`${file}: static ${prop.name}`);
    for(const child of node.children||[]) visit(child,file);
  }
  for(const file of files) {
    const source=readFileSync(file,'utf8'); const {descriptor,errors}=parse(source); assert.deepEqual(errors,[]);
    visit(parseTemplate(descriptor.template.content),file);
    for(const match of source.matchAll(/\bt\('([a-zA-Z0-9]+)'/g)) assert.ok(en[match[1]],`Missing ${match[1]}`);
  }
});
test('sprite bounds stay centered within all fifteen cells on desktop and mobile', () => {
  for(const [w,h] of [[1100,500],[360,235],[290,190],[1800,818]]) {
    const cells=reelLayout(w,h); assert.equal(cells.length,15);
    for(const c of cells) { assert(c.size<c.width&&c.size<c.height); assert(c.x>=0&&c.y>=0); assert(c.x+c.width<=w+.01&&c.y+c.height<=h+.01); }
  }
});
