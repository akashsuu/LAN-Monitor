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
  'messenger.com', 'signal.org', 'line.me', 'viber.com', 'wechat.com', 'imo.im',
  'kakaotalk.com', 'clubhouse.com', 'meetup.com', 'aminoapps.com', 'discordapp.com',

  // Video, music, and live streaming
  'netflix.com', 'spotify.com', 'twitch.tv', 'dailymotion.com', 'vimeo.com',
  'hulu.com', 'disneyplus.com', 'primevideo.com', 'max.com', 'peacocktv.com',
  'paramountplus.com', 'crunchyroll.com', 'soundcloud.com', 'music.apple.com',
  'pandora.com', 'deezer.com', 'jiosaavn.com', 'hotstar.com', 'zee5.com',
  'sonyliv.com', 'mxplayer.in',
  'tubitv.com', 'pluto.tv', 'roku.com', 'tv.apple.com', 'mubi.com', 'curiositystream.com',
  'bandcamp.com', 'tidal.com', 'last.fm', 'gaana.com', 'wynk.in', 'audiomack.com',

  // Games and gaming communities
  'roblox.com', 'epicgames.com', 'steampowered.com', 'store.steampowered.com',
  'minecraft.net', 'playstation.com', 'xbox.com', 'nintendo.com', 'ea.com',
  'ubisoft.com', 'riotgames.com', 'battle.net', 'valorant.com', 'fortnite.com',
  'chess.com', 'discord.gg',
  'leagueoflegends.com', 'genshin.hoyoverse.com', 'hoyoverse.com', 'rockstargames.com',
  'take2games.com', 'itch.io', 'gamejolt.com', 'kongregate.com', 'miniclip.com',
  'crazygames.com', 'poki.com', 'twitchcdn.net',

  // Shopping, payments, and food delivery
  'amazon.com', 'ebay.com', 'paypal.com', 'walmart.com', 'target.com',
  'etsy.com', 'aliexpress.com', 'temu.com', 'flipkart.com', 'myntra.com',
  'meesho.com', 'snapdeal.com', 'shopify.com', 'instacart.com', 'doordash.com',
  'swiggy.com', 'zomato.com',
  'bestbuy.com', 'costco.com', 'wayfair.com', 'shein.com', 'wish.com', 'lazada.com',
  'shopee.com', 'olx.in', 'bigbasket.com', 'nykaa.com', 'zepto.com', 'blinkit.com',

  // Search, email, developer, AI, and cloud services
  'wikipedia.org', 'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
  'gmail.com', 'google.com', 'yahoo.com', 'bing.com', 'duckduckgo.com',
  'chatgpt.com', 'openai.com', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com',
  'perplexity.ai', 'character.ai', 'huggingface.co', 'cloudflare.com', 'microsoft.com',
  'office.com', 'dropbox.com', 'drive.google.com', 'onedrive.live.com', 'notion.so',
  'canva.com', 'figma.com', 'slack.com', 'zoom.us', 'teams.microsoft.com',
  'proton.me', 'protonmail.com', 'mail.yahoo.com', 'outlook.com', 'icloud.com', 'mega.io',
  'box.com', 'mediafire.com', 'wetransfer.com', 'trello.com', 'asana.com', 'monday.com',
  'airtable.com', 'miro.com', 'linear.app', 'vercel.com', 'netlify.com', 'replit.com',
  'codepen.io', 'codesandbox.io', 'stackoverflow.blog',

  // News, forums, and blogs
  'news.google.com', 'bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com',
  'reuters.com', 'forbes.com', 'buzzfeed.com', '9gag.com', 'imgur.com',
  'wordpress.com', 'blogger.com', 'wattpad.com', 'archive.org',
  'espn.com', 'ndtv.com', 'indiatimes.com', 'hindustantimes.com', 'thehindu.com',
  'indianexpress.com', 'timesofindia.com', 'moneycontrol.com', 'businessinsider.com',
  'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com', 'redditstatic.com',

  // Learning, creative work, finance, and travel
  'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'skillshare.com',
  'unacademy.com', 'byjus.com', 'chegg.com', 'duolingo.com', 'udacity.com',
  'behance.net', 'dribbble.com', 'artstation.com', 'pixiv.net', 'unsplash.com',
  'pexels.com', 'giphy.com', 'tenor.com', 'freepik.com',
  'binance.com', 'coinbase.com', 'kraken.com', 'coindesk.com', 'tradingview.com',
  'zerodha.com', 'groww.in', 'coinmarketcap.com', 'booking.com', 'airbnb.com',
  'makemytrip.com', 'goibibo.com', 'expedia.com', 'tripadvisor.com',

  // Dating and adult content
  'tinder.com', 'bumble.com', 'hinge.co', 'onlyfans.com', 'xvideos.com', 'pornhub.com',
  'xnxx.com', 'redtube.com', 'youporn.com', 'xhamster.com', 'chaturbate.com',
  'livejasmin.com', 'brazzers.com',
  'spankbang.com', 'hqporner.com', 'txxx.com', 'motherless.com', 'rule34.xxx',
  'nhentai.net', 'fapello.com', 'fansly.com', 'stripchat.com', 'camsoda.com',
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
