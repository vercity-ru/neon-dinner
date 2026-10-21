// Copies the reviewed asset package; never rewrites the reference artwork.
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(process.argv[2] || '../output/neon-dinner-assets');
const target = path.resolve(__dirname, '../public/symbols');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const metadata = {};
for (const symbol of manifest.symbols) {
  const name = symbol.name, dir = path.join(target, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const ext of ['png', 'json', 'atlas']) {
    fs.copyFileSync(path.join(source, 'symbols', name, `${name}.${ext}`), path.join(dir, `${name}.${ext}`));
  }
  metadata[name] = { ...symbol.baseBounds.alphaBounds, canvasSize: 640, atlasX: 4, atlasY: 4 };
}
fs.writeFileSync(path.resolve(__dirname, '../src/game/assets/symbol-rigs.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(`Imported ${manifest.symbols.length} symbol rigs and their shared static textures.`);
