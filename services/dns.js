const dns = require('dns');
const net = require('net');
const https = require('https');

const DEFAULT_TIMEOUT = 5000;

function errorDetails(err) {
  if (!err) return null;
  return {
    code: err.code || 'DNS_ERROR',
    message: err.message || 'DNS lookup failed'
  };
}

function createTimeoutError(hostname, timeout) {
  const err = new Error(`DNS lookup for ${hostname} timed out after ${timeout}ms`);
  err.code = 'ETIMEOUT';
  return err;
}

function resolveWithTimeout(hostname, timeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, createTimeoutError(hostname, timeout)), timeout);

    dns.resolve4(hostname, (err, addresses) => {
      if (err) finish(reject, err);
      else finish(resolve, addresses);
    });
  });
}

function resolveOverHttps(hostname, timeout) {
  return new Promise((resolve, reject) => {
    const request = https.get({
      hostname: '1.1.1.1',
      servername: 'cloudflare-dns.com',
      path: `/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      headers: {
        Accept: 'application/dns-json',
        Host: 'cloudflare-dns.com'
      },
      timeout
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          const err = new Error(`DNS-over-HTTPS returned HTTP ${response.statusCode}`);
          err.code = 'EDOHHTTP';
          reject(err);
          return;
        }
        try {
          const payload = JSON.parse(body);
          const addresses = (payload.Answer || [])
            .filter(answer => answer.type === 1 && net.isIP(answer.data) === 4)
            .map(answer => answer.data);
          if (addresses.length === 0) {
            const err = new Error('DNS-over-HTTPS returned no IPv4 address');
            err.code = payload.Status === 3 ? 'ENOTFOUND' : 'ENODATA';
            reject(err);
            return;
          }
          resolve(addresses);
        } catch {
          const err = new Error('Invalid DNS-over-HTTPS response');
          err.code = 'EDOHPARSE';
          reject(err);
        }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(createTimeoutError(hostname, timeout));
    });
  });
}

const dnsService = {
  getServers() {
    try {
      return dns.getServers().filter(Boolean);
    } catch {
      return [];
    }
  },

  isResolverUnavailable(error) {
    return Boolean(error && ['ECONNREFUSED', 'ETIMEOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'EAI_AGAIN'].includes(error.code));
  },

  async lookup(hostname, options = {}) {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    if (!hostname || typeof hostname !== 'string') {
      return { hostname, addresses: [], error: { code: 'EINVAL', message: 'A hostname is required' } };
    }

    if (net.isIP(hostname)) {
      return { hostname, addresses: [hostname], error: null };
    }

    try {
      const addresses = await resolveWithTimeout(hostname, timeout);
      return { hostname, addresses, error: null, source: 'system' };
    } catch (systemError) {
      if (!this.isResolverUnavailable(systemError)) {
        return { hostname, addresses: [], error: errorDetails(systemError), source: 'system' };
      }
      try {
        const addresses = await resolveOverHttps(hostname, timeout);
        return { hostname, addresses, error: null, source: 'dns-over-https' };
      } catch (dohError) {
        return { hostname, addresses: [], error: errorDetails(dohError), source: 'dns-over-https' };
      }
    }
  },

  async measureLatency(hostname, options = {}) {
    const start = Date.now();
    const result = await this.lookup(hostname, options);
    return {
      hostname,
      latency: result.error ? null : Date.now() - start,
      error: result.error,
      addresses: result.addresses
    };
  }
};

module.exports = dnsService;
