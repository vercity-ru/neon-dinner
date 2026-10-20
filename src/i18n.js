import en from './locales/en.json' with { type: 'json' };

// Flat camelCase keys. Values are text only; no HTML injection.
// Supply another dictionary to createTranslator to integrate a locale selector later.
export function createTranslator(messages, fallback = en) {
  return (key, params = {}) => {
    const template = messages[key] ?? fallback[key];
    if (typeof template !== 'string') throw new Error(`Missing translation: ${key}`);
    return template.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in params)) throw new Error(`Missing parameter ${name} for ${key}`);
      return String(params[name]);
    });
  };
}
export const t = createTranslator(en);
