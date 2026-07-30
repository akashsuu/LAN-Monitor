const https = require('https');
const http = require('http');
const dns = require('dns');
const url = require('url');
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
  },

  async runSpeedTest(onProgress) {
    const DOWNLOAD_URLS = [
      { url: 'http://speedtest.tele2.net/10MB.zip', size: 10 * 1024 * 1024 },
      { url: 'http://proof.ovh.net/files/10Mio.dat', size: 10 * 1024 * 1024 },
      { url: 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js', size: 3 * 1024 * 1024 }
    ];

    async function downloadFile(downloadUrl, expectedSize) {
      return new Promise((resolve) => {
        const start = Date.now();
        let downloaded = 0;
        const parsed = url.parse(downloadUrl);
        const proto = parsed.protocol === 'https:' ? https : http;

        const req = proto.get(downloadUrl, { timeout: 15000 }, (res) => {
          res.on('data', (chunk) => {
            downloaded += chunk.length;
            if (onProgress) onProgress(downloaded, expectedSize);
          });
          res.on('end', () => {
            const elapsed = (Date.now() - start) / 1000;
            const bits = downloaded * 8;
            const mbps = elapsed > 0 ? parseFloat((bits / elapsed / 1000000).toFixed(2)) : 0;
            resolve({ success: true, mbps, bytes: downloaded, elapsed, error: null });
          });
          res.on('error', (err) => {
            resolve({ success: false, mbps: 0, bytes: downloaded, elapsed: 0, error: err.message });
          });
        });
        req.on('error', (err) => {
          resolve({ success: false, mbps: 0, bytes: 0, elapsed: 0, error: err.message });
        });
        req.setTimeout(15000, () => {
          req.destroy();
          const elapsed = (Date.now() - start) / 1000;
          const bits = downloaded * 8;
          const mbps = elapsed > 0 ? parseFloat((bits / elapsed / 1000000).toFixed(2)) : 0;
          resolve({ success: mbps > 0, mbps, bytes: downloaded, elapsed, error: mbps > 0 ? null : 'Timeout' });
        });
      });
    }

    for (const source of DOWNLOAD_URLS) {
      const result = await downloadFile(source.url, source.size);
      if (result.success && result.mbps > 0) return result;
    }
    return { success: false, mbps: 0, bytes: 0, elapsed: 0, error: 'All download sources failed' };
  },

  async runUploadTest(onProgress) {
    return new Promise((resolve) => {
      const data = Buffer.alloc(5 * 1024 * 1024, 'A');
      const start = Date.now();
      const req = https.request({
        hostname: 'httpbin.org',
        path: '/post',
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': data.length },
        timeout: 30000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const elapsed = (Date.now() - start) / 1000;
          const bits = data.length * 8;
          const mbps = elapsed > 0 ? parseFloat((bits / elapsed / 1000000).toFixed(2)) : 0;
          resolve({ success: true, mbps, bytes: data.length, elapsed, error: null });
        });
      });
      req.on('error', (err) => resolve({ success: false, mbps: 0, bytes: 0, elapsed: 0, error: err.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, mbps: 0, bytes: 0, elapsed: 0, error: 'Timeout' }); });
      req.write(data);
      req.end();
    });
  }
};

module.exports = internetService;
