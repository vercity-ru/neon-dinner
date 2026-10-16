import { GameController } from './game-controller.js';
import { PreviewAdapter } from './preview-adapter.js';
import { symbols, symbolById } from './symbols.js';
import { parseMoney, formatMoney, inputMoney } from './money.js';
const $ = id => document.getElementById(id);
const adapter = new PreviewAdapter();
const game = new GameController(adapter);
let editingBet = false;
const cells = Array.from({ length: 15 }, (_, i) => {
  const cell = document.createElement('div'); cell.className = 'cell';
  const img = document.createElement('img'); img.className = 'symbol'; img.draggable = false;
  cell.append(img); $('reels').append(cell); return { cell, img };
});
// Preload all symbol art before the first preview interaction.
symbols.forEach(s => { const image = new Image(); image.src = `./assets/${s.id}.webp`; });
function render() {
  const s = game.state;
  const busy = ['spinning','recovering'].includes(s.phase);
  $('balance').textContent = formatMoney(s.balanceCents);
  $('win').textContent = formatMoney(s.winCents);
  if (!editingBet) $('bet').value = inputMoney(s.betCents);
  $('spin-status').textContent = s.phase === 'loading' ? 'Loading…' : s.phase === 'spinning' ? 'Good luck' : ['reconnecting','recovering'].includes(s.phase) ? 'Reconnecting…' : s.phase === 'error' ? 'Round unavailable' : s.result ? (s.winCents > 0 ? `You have won ${formatMoney(s.winCents)}` : 'Better luck next time') : 'Place a bet';
  $('spin-status').classList.toggle('winning', s.phase === 'result' && s.winCents > 0);
  $('reels').classList.toggle('spinning', s.phase === 'spinning');
  $('reels').setAttribute('aria-busy', String(s.phase === 'spinning'));
  s.grid.flat().forEach((id, i) => {
    const symbol = symbolById[id];
    if (!symbol) return;
    if (cells[i].img.dataset.symbol !== id) {
      cells[i].img.src = `./assets/${id}.webp`; cells[i].img.dataset.symbol = id;
    }
    cells[i].img.alt = `${symbol.name}, reel ${i % 5 + 1}, row ${Math.floor(i / 5) + 1}`;
    cells[i].cell.classList.toggle('is-winner', s.winningCells.includes(i));
  });
  for (const id of ['bet','bet-minus','bet-plus','spin']) $(id).disabled = game.locked;
  document.querySelectorAll('[data-bet]').forEach(b => { b.disabled = game.locked; b.setAttribute('aria-pressed', String(s.betCents === Number(b.dataset.bet) * 100)); });
  $('autoplay').disabled = !s.autoActive && (game.locked || s.stopping);
  $('autoplay').textContent = s.autoActive ? 'STOP AUTOPLAY' : s.stopping ? 'STOPPING…' : 'AUTOPLAY';
  $('autoplay').classList.toggle('active', s.autoActive);
  $('auto-count').textContent = s.stopping ? 'Current spin will finish' : s.autoActive ? `${s.remaining} spins remaining` : '';
  $('bet-error').textContent = ['reconnecting','recovering'].includes(s.phase) ? '' : s.error;
  $('bet').setAttribute('aria-invalid', String(Boolean(s.error) && !game.locked));
  $('connection-overlay').hidden = !['reconnecting','recovering'].includes(s.phase);
  $('connection-message').textContent = s.error;
  $('reconnect').disabled = s.phase === 'recovering';
  $('reconnect').textContent = s.phase === 'recovering' ? 'Reconnecting…' : 'Reconnect';
  $('scenario').disabled = game.locked;
  $('history-open').disabled = busy || s.autoActive;
  $('rules-open').disabled = busy || s.autoActive;
  $('preview-open').disabled = game.locked;
}
game.addEventListener('change', render);
function commitBet() {
  // Preserve invalid user input so clicking Spin cannot silently use an older bet.
  editingBet = true;
  const valid = game.setBet(parseMoney($('bet').value));
  if (valid) { editingBet = false; render(); }
  return valid;
}
$('bet').addEventListener('focus', () => { editingBet = true; });
$('bet').addEventListener('change', commitBet);
$('bet').addEventListener('blur', () => { editingBet = false; });
$('bet').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitBet(); $('bet').blur(); } });
$('bet-minus').addEventListener('click', () => game.setBet(Math.max(game.state.config.minBetCents, game.state.betCents - game.state.config.betStepCents)));
$('bet-plus').addEventListener('click', () => game.setBet(game.state.betCents + game.state.config.betStepCents));
document.querySelectorAll('[data-bet]').forEach(b => b.addEventListener('click', () => game.setBet(Number(b.dataset.bet) * 100)));
$('spin').addEventListener('click', () => { if (commitBet()) game.spin(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.repeat || document.querySelector('dialog[open]') || ['INPUT','SELECT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  e.preventDefault(); if (commitBet()) game.spin();
});
function openDialog(id) { $(id).showModal(); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => {
  if (e.target !== dialog) return; const r = dialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
}));
$('rules-open').addEventListener('click', () => openDialog('rules-dialog'));
$('preview-open').addEventListener('click', () => openDialog('preview-dialog'));
$('scenario').addEventListener('change', e => adapter.setScenario(e.target.value));
$('autoplay').addEventListener('click', () => {
  if (game.state.autoActive) return game.stopAuto();
  if (!commitBet()) return;
  $('auto-bet').textContent = formatMoney(game.state.betCents); openDialog('auto-dialog');
});
$('auto-start').addEventListener('click', () => { $('auto-dialog').close(); game.startAuto(Number($('auto-spins').value)); });
$('reconnect').addEventListener('click', () => game.recover());
$('history-open').addEventListener('click', () => {
  const container = $('history-content'); container.replaceChildren();
  if (!game.state.history.length) {
    const empty = document.createElement('div'); empty.className = 'empty-history';
    const heading = document.createElement('strong'); heading.textContent = 'A fresh start';
    const text = document.createElement('p'); text.textContent = 'Your completed preview spins will appear here.';
    empty.append(heading, text); container.append(empty);
  } else {
    const wrap = document.createElement('div'); wrap.className = 'table-scroll';
    const table = document.createElement('table');
    const head = document.createElement('thead'); const header = document.createElement('tr');
    for (const name of ['Time','Bet','Multiplier','Payout','Status']) { const th = document.createElement('th'); th.textContent = name; header.append(th); }
    head.append(header); table.append(head); const body = document.createElement('tbody');
    for (const row of game.state.history) {
      const tr = document.createElement('tr');
      const values = [new Date(row.timestamp).toLocaleTimeString('en-GB'), formatMoney(row.betCents), row.multiplier != null ? `${row.multiplier}×` : '—', formatMoney(row.winCents), row.status];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      body.append(tr);
    }
    table.append(body); wrap.append(table); container.append(wrap);
  }
  openDialog('history-dialog');
});
await game.initialize();
