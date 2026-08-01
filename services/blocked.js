const net = require('net');
const store = require('../config/store');
const dnsService = require('./dns');

const DEFAULT_SITES = [
  // Social networks and communities
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com',
  'tiktok.com', 'snapchat.com', 'whatsapp.com', 'telegram.org', 'reddit.com',
  'discord.com', 'pinterest.com', 'linkedin.com', 'tumblr.com', 'threads.net',
  'mastodon.social', 'quora.com', 'medium.com', 'flickr.com', 'deviantart.com',
  'vk.com', 'weibo.com', 'weibo.cn', 'bsky.app', 'nextdoor.com',

  // Video, music, and live streaming
  'netflix.com', 'spotify.com', 'twitch.tv', 'dailymotion.com', 'vimeo.com',
  'hulu.com', 'disneyplus.com', 'primevideo.com', 'max.com', 'peacocktv.com',
  'paramountplus.com', 'crunchyroll.com', 'soundcloud.com', 'music.apple.com',
  'pandora.com', 'deezer.com', 'jiosaavn.com', 'hotstar.com', 'zee5.com',
  'sonyliv.com', 'mxplayer.in',

  // Games and gaming communities
  'roblox.com', 'epicgames.com', 'steampowered.com', 'store.steampowered.com',
  'minecraft.net', 'playstation.com', 'xbox.com', 'nintendo.com', 'ea.com',
  'ubisoft.com', 'riotgames.com', 'battle.net', 'valorant.com', 'fortnite.com',
  'chess.com', 'discord.gg',

  // Shopping, payments, and food delivery
  'amazon.com', 'ebay.com', 'paypal.com', 'walmart.com', 'target.com',
  'etsy.com', 'aliexpress.com', 'temu.com', 'flipkart.com', 'myntra.com',
  'meesho.com', 'snapdeal.com', 'shopify.com', 'instacart.com', 'doordash.com',
  'swiggy.com', 'zomato.com',

  // Search, email, developer, AI, and cloud services
  'wikipedia.org', 'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
  'gmail.com', 'google.com', 'yahoo.com', 'bing.com', 'duckduckgo.com',
  'chatgpt.com', 'openai.com', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com',
  'perplexity.ai', 'character.ai', 'huggingface.co', 'cloudflare.com', 'microsoft.com',
  'office.com', 'dropbox.com', 'drive.google.com', 'onedrive.live.com', 'notion.so',
  'canva.com', 'figma.com', 'slack.com', 'zoom.us', 'teams.microsoft.com',

  // News, forums, and blogs
  'news.google.com', 'bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com',
  'reuters.com', 'forbes.com', 'buzzfeed.com', '9gag.com', 'imgur.com',
  'wordpress.com', 'blogger.com', 'wattpad.com', 'archive.org',

  // Dating and adult content
  'tinder.com', 'bumble.com', 'hinge.co', 'onlyfans.com', 'xvideos.com', 'pornhub.com',
  'xnxx.com', 'redtube.com', 'youporn.com', 'xhamster.com', 'chaturbate.com',
  'livejasmin.com', 'brazzers.com',
];

const BASELINE_HOSTS = ['google.com', '1.1.1.1', 'cloudflare.com'];

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

  const dnsResult = await dnsService.lookup(hostname);
  if (dnsResult.error) {
    const dnsError = dnsResult.error;
    const isNetworkIssue = dnsService.isResolverUnavailable(dnsError);
    return {
      site: hostname,
      blocked: false,
      blockType: isNetworkIssue ? 'DNS Unavailable' : 'DNS Failed',
      reason: isNetworkIssue
        ? `DNS resolver is unreachable (${dnsError.code}); this environment may block DNS requests`
        : `DNS resolution failed (${dnsError.code})`,
      dnsOK: false,
      connectOK: false,
      latency: null,
      dnsError: dnsError.code || null
    };
  }

  const connect443 = await connectTest(dnsResult.addresses[0], 443);
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

  const connect80 = await connectTest(dnsResult.addresses[0], 80);
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
    const dnsErrors = results.filter(r => r.blockType === 'DNS Unavailable' || r.blockType === 'DNS Failed');

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
