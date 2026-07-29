const https = require('https');
const http = require('http');
const dns = require('dns');
const pingService = require('./ping');

const internetService = {
  async getPublicIP() {
    return new Promise((resolve) => {
      const sources = [
        'https://api.ipify.org?format=json',
        'https://api.myip.com',
        'https://httpbin.org/ip'
      ];
      let tried = 0;
      const tryNext = () => {
        if (tried >= sources.length) {
          resolve({ ip: 'Unknown', error: 'Could not reach any public IP service' });
          return;
        }
        const url = sources[tried++];
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const ip = parsed.ip || parsed.address || parsed.origin || 'Unknown';
              resolve({ ip, error: null });
            } catch {
              tryNext();
            }
          });
        });
        req.on('error', () => tryNext());
        req.on('timeout', () => { req.destroy(); tryNext(); });
      };
      tryNext();
    });
  },

  async getPublicInfo() {
    return new Promise((resolve) => {
      const req = https.get('https://ipapi.co/json/', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ ip: 'Unknown', city: 'Unknown', region: 'Unknown', country_name: 'Unknown', org: 'Unknown' });
          }
        });
      });
      req.on('error', () => {
        resolve({ ip: 'Unknown', city: 'Unknown', region: 'Unknown', country_name: 'Unknown', org: 'Unknown' });
      });
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ ip: 'Unknown', city: 'Unknown', region: 'Unknown', country_name: 'Unknown', org: 'Unknown' });
      });
    });
  },

  async checkConnectivity() {
    return new Promise((resolve) => {
      const start = Date.now();
      const req = https.get('https://clients3.google.com/generate_204', (res) => {
        const latency = Date.now() - start;
        res.resume();
        resolve({ online: true, latency, statusCode: res.statusCode, error: null });
      });
      req.on('error', (err) => {
        resolve({ online: false, latency: null, statusCode: null, error: err.message });
      });
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ online: false, latency: null, statusCode: null, error: 'Timeout' });
      });
    });
  },

  async measureDNSLatency() {
    return new Promise((resolve) => {
      const start = Date.now();
      dns.resolve4('google.com', (err) => {
        const latency = Date.now() - start;
        resolve({ latency, error: err ? err.message : null });
      });
    });
  }
};

module.exports = internetService;
