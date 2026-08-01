const dns = require('dns');
const net = require('net');
const store = require('../config/store');

const DEFAULT_SITES = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com',
  'tiktok.com', 'snapchat.com', 'whatsapp.com', 'telegram.org', 'reddit.com',
  'netflix.com', 'discord.com', 'spotify.com', 'twitch.tv', 'pinterest.com',
  'linkedin.com', 'amazon.com', 'ebay.com', 'paypal.com', 'wikipedia.org',
  'github.com', 'stackoverflow.com', 'gmail.com', 'google.com', 'yahoo.com',
  'bing.com', 'chatgpt.com', 'openai.com', 'cloudflare.com', 'microsoft.com',
  'roblox.com', 'epicgames.com', 'steampowered.com', 'dailymotion.com', 'vimeo.com',
  'onlyfans.com', 'xvideos.com', 'pornhub.com', '9gag.com', 'imgur.com'
];

const BASELINE_HOSTS = ['google.com', '1.1.1.1', 'cloudflare.com'];

function resolveHost(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) {
        resolve({ ok: false, addresses: [], error: err });
        return;
      }
      resolve({ ok: true, addresses });
    });
  });
}

function connectTest(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ open: true, latency: Date.now() - start });
    });
    socket.on('error', () => {
      socket.destroy();
      resolve({ open: false, latency: Date.now() - start });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ open: false, latency: timeout });
    });
    socket.connect(port, host);
  });
}

async function checkSite(site) {
  const hostname = site.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const dnsResult = await resolveHost(hostname);
  if (!dnsResult.ok) {
    const dnsError = dnsResult.error || {};
    const isNXDOMAIN = dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA';
    const isNetworkIssue = dnsError.code === 'ECONNREFUSED' || dnsError.code === 'ETIMEOUT' || dnsError.code === 'ENETUNREACH';
    return {
      site: hostname,
      blocked: isNXDOMAIN,
      blockType: isNetworkIssue ? 'DNS Error' : 'DNS Blocked',
      reason: isNetworkIssue
        ? `DNS server unreachable (${dnsError.code}) - possible network issue`
        : 'DNS resolution failed - domain blocked or nonexistent',
      dnsOK: false,
      connectOK: false,
      latency: null,
      dnsError: dnsError.code || null
    };
  }

  const connect443 = await connectTest(hostname, 443);
  if (connect443.open) {
    return {
      site: hostname,
      blocked: false,
      blockType: 'Reachable',
      reason: 'HTTPS connection succeeded',
      dnsOK: true,
      connectOK: true,
      latency: connect443.latency
    };
  }

  const connect80 = await connectTest(hostname, 80);
  if (connect80.open) {
    return {
      site: hostname,
      blocked: false,
      blockType: 'Reachable',
      reason: 'HTTP connection succeeded',
      dnsOK: true,
      connectOK: true,
      latency: connect80.latency
    };
  }

  return {
    site: hostname,
    blocked: true,
    blockType: 'Connection Blocked',
    reason: 'DNS resolves but TCP connection blocked (port 80/443)',
    dnsOK: true,
    connectOK: false,
    latency: null
  };
}

const blockedService = {
  DEFAULT_SITES,

  getAllSites() {
    const custom = store.getBlockedSites();
    const merged = [...DEFAULT_SITES];
    for (const s of custom) {
      if (!merged.includes(s)) merged.push(s);
    }
    return merged;
  },

  async checkConnectivity() {
    for (const host of BASELINE_HOSTS) {
      const result = await checkSite(host);
      if (!result.blocked) return { online: true, host };
    }
    return { online: false, host: null };
  },

  async scanAll(onProgress) {
    const sites = this.getAllSites();
    const results = [];
    const concurrency = 10;

    for (let i = 0; i < sites.length; i += concurrency) {
      const chunk = sites.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(site => checkSite(site)));
      results.push(...chunkResults);
      if (onProgress) onProgress(results.length, sites.length);
    }

    return this.summarize(results);
  },

  async checkOne(site) {
    return checkSite(site);
  },

  summarize(results) {
    const blocked = results.filter(r => r.blocked);
    const reachable = results.filter(r => !r.blocked);
    const dnsBlocked = blocked.filter(r => r.blockType === 'DNS Blocked');
    const connBlocked = blocked.filter(r => r.blockType === 'Connection Blocked');
    const dnsErrors = results.filter(r => r.blockType === 'DNS Error');

    return {
      total: results.length,
      blockedCount: blocked.length,
      reachableCount: reachable.length,
      dnsBlockedCount: dnsBlocked.length,
      connBlockedCount: connBlocked.length,
      dnsErrorCount: dnsErrors.length,
      blocked,
      reachable,
      dnsErrors,
      results
    };
  }
};

module.exports = blockedService;
