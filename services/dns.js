const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

const dnsService = {
  async lookup(hostname) {
    try {
      const addresses = await resolve4(hostname);
      return { hostname, addresses, error: null };
    } catch (err) {
      return { hostname, addresses: [], error: err.message };
    }
  },

  measureLatency(hostname) {
    return new Promise((resolve) => {
      const start = Date.now();
      dns.resolve4(hostname, (err) => {
        const latency = Date.now() - start;
        resolve({ hostname, latency, error: err ? err.message : null });
      });
    });
  }
};

module.exports = dnsService;
