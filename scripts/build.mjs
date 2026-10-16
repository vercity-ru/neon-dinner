import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'src', 'assets']) {
  await cp(name, `dist/${name}`, { recursive: true });
}
console.log('Static frontend built in dist/');
