export function parseMoney(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}
export function formatMoney(cents, currency = 'EUR') {
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)} ${currency}`;
}
export function inputMoney(cents) { return (cents / 100).toFixed(2).replace('.', ','); }
export function validateBet(cents, config, balance) {
  if (cents === null || !Number.isSafeInteger(cents)) return { key: 'invalidAmount' };
  if (cents < config.minBetCents) return { key: 'minimumBet', params: { amount: formatMoney(config.minBetCents) } };
  if ((cents - config.minBetCents) % config.betStepCents !== 0) return { key: 'betStep', params: { amount: formatMoney(config.betStepCents) } };
  if (config.maxBetCents != null && cents > config.maxBetCents) return { key: 'maximumBet', params: { amount: formatMoney(config.maxBetCents) } };
  if (cents > balance) return { key: 'insufficientBalance' };
  return '';
}
