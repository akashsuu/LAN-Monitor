const realChalk = require('chalk');

// Accent color used across the CLI (light pink theme).
const ACCENT = '#f48fb1';

const ACCENT_NAMES = ['cyan', 'blue'];

function makeProxy(target) {
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'cyan' || prop === 'blue') {
        return makeProxy(t.hex(ACCENT));
      }
      const value = t[prop];
      return typeof value === 'function' ? makeProxy(value) : value;
    },
    apply(t, thisArg, args) {
      return t(...args);
    }
  });
}

module.exports = makeProxy(realChalk);