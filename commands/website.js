const chalk = require('chalk');
const https = require('https');
const http = require('http');
const dns = require('dns');
const net = require('net');
const ora = require('ora');
const store = require('../config/store');
const formatter = require('../utils/formatter');
const network = require('../utils/network');

const websiteCommand = {
  add(url) {
    if (!url) {
      console.log(chalk.red('  Error: Please provide a URL.'));
      console.log(chalk.gray('  Usage: ln website add <url>'));
      return;
    }
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const added = store.addWebsite(url);
    if (added) {
      const name = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      console.log(chalk.green(`\n  \u2713 Added website: ${chalk.cyan(url)}`));
      console.log(chalk.gray(`    Name: ${name}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Website already being monitored: ${url}\n`));
    }
  },

  remove(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a website name or URL.'));
      return;
    }
    const removed = store.removeWebsite(name);
    if (removed) {
      console.log(chalk.green(`\n  \u2713 Removed website: ${chalk.cyan(name)}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Website not found: ${name}\n`));
    }
  },

  list() {
    const websites = store.getWebsites();
    if (websites.length === 0) {
      console.log(chalk.yellow('\n  No websites being monitored.\n'));
      return;
    }
    console.log('');
    console.log(`  ${chalk.bold('Monitored Websites')} ${chalk.gray(`(${websites.length})`)}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(40))}`);
    for (const site of websites) {
      console.log(`  ${chalk.cyan('\u2022')} ${site.name || site.url}`);
      console.log(`    ${chalk.gray(site.url)}`);
    }
    console.log('');
  },

  async check(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a website name.'));
      return;
    }

    const websites = store.getWebsites();
    const site = websites.find(w => w.name === name || w.url === name);
    if (!site) {
      console.log(chalk.yellow(`\n  \u26A0 Website not found: ${name}\n`));
      return;
    }

    const spinner = ora({ text: `Checking ${chalk.cyan(site.url)}...`, color: 'cyan' }).start();
    const results = await this.checkSite(site.url);
    spinner.stop();

    console.log('');
    formatter.heading(`Website Check - ${site.url}`);
    formatter.labelValue('HTTP Status', results.statusCode ? chalk.green(`${results.statusCode}`) : chalk.red('Failed'));
    formatter.labelValue('Response Time', results.latency !== null ? formatter.ms(results.latency) : chalk.gray('N/A'));
    formatter.labelValue('SSL', results.ssl ? chalk.green('Valid') : chalk.red(results.sslError || 'N/A'));
    formatter.labelValue('SSL Expiry', results.sslExpiry || chalk.gray('N/A'));
    formatter.labelValue('DNS', results.dns ? chalk.green(results.dns) : chalk.red('Failed'));
    formatter.labelValue('Status', results.online ? chalk.green('Online') : chalk.red('Offline'));

    store.addHistoryEntry({
      type: 'website',
      target: site.url,
      status: results.online,
      latency: results.latency,
      statusCode: results.statusCode
    });
    console.log('');
  },

  history(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a website name.'));
      return;
    }
    const history = store.getHistory();
    const entries = history.filter(e => e.type === 'website' && e.target && e.target.includes(name));
    if (entries.length === 0) {
      console.log(chalk.yellow(`\n  No history for: ${name}\n`));
      return;
    }
    console.log('');
    console.log(`  ${chalk.bold('Website History')} ${chalk.gray('- ' + name)}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(50))}`);
    entries.slice(0, 20).forEach(entry => {
      const status = entry.status ? chalk.green('\u2713') : chalk.red('\u2717');
      const time = new Date(entry.timestamp).toLocaleString();
      console.log(`  ${status} ${chalk.gray(time)} - ${entry.latency ? `${entry.latency.toFixed(0)}ms` : 'N/A'} (${entry.statusCode || '?'})`);
    });
    console.log('');
  },

  checkSite(url) {
    return new Promise((resolve) => {
      const start = Date.now();
      const parsedUrl = new URL(url);
      const proto = parsedUrl.protocol === 'https:' ? https : http;

      let dnsResolved = null;
      dns.resolve4(parsedUrl.hostname, (err, addresses) => {
        if (!err && addresses.length > 0) dnsResolved = addresses[0];
      });

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname || '/',
        method: 'HEAD',
        timeout: 10000,
        rejectUnauthorized: false
      };

      const req = proto.request(options, (res) => {
        const latency = Date.now() - start;
        let sslValid = null;
        let sslExpiry = null;
        if (res.connection && res.connection.getPeerCertificate) {
          try {
            const cert = res.connection.getPeerCertificate();
            if (cert && cert.subject) {
              sslValid = new Date() < new Date(cert.valid_to);
              sslExpiry = new Date(cert.valid_to).toLocaleDateString();
            }
          } catch {
            sslValid = false;
          }
        }
        res.resume();
        resolve({
          url,
          statusCode: res.statusCode,
          latency,
          ssl: sslValid,
          sslError: sslValid === null ? 'Not checked' : (sslValid ? null : 'Expired'),
          sslExpiry,
          dns: dnsResolved,
          online: res.statusCode >= 200 && res.statusCode < 500,
          error: null
        });
      });

      req.on('error', (err) => {
        resolve({
          url,
          statusCode: null,
          latency: Date.now() - start,
          ssl: false,
          sslError: err.message,
          sslExpiry: null,
          dns: dnsResolved,
          online: false,
          error: err.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url,
          statusCode: null,
          latency: Date.now() - start,
          ssl: false,
          sslError: 'Timeout',
          sslExpiry: null,
          dns: dnsResolved,
          online: false,
          error: 'Timeout'
        });
      });

      req.end();
    });
  },

  async scanLocal(target) {
    const localIP = network.getLocalIP();
    const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
    const ports = [80, 443, 3000, 5000, 8000, 8080, 8443, 8888, 9090, 3001, 4200, 5173, 8090, 9443];
    const CONCURRENCY = 100;

    const checkPort = (host, port) => new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, host);
    });

    async function runTasks(tasks) {
      const results = [];
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(fn => fn()));
        results.push(...batchResults.filter(Boolean));
      }
      return results;
    }

    const spinner = ora({ text: 'Scanning for web servers...', color: 'cyan' }).start();

    if (target) {
      const parts = target.split(':');
      const host = parts[0];
      if (parts.length === 2) {
        const port = parseInt(parts[1], 10);
        spinner.text = `Checking ${chalk.cyan(target)}...`;
        const open = await checkPort(host, port);
        spinner.stop();
        if (!open) { console.log(chalk.yellow('\n  Port closed or no response.\n')); return; }
        console.log('');
        formatter.heading('Web Server Found');
        const Table = require('cli-table3');
        const table = new Table({
          head: [chalk.cyan('Host'), chalk.cyan('Port'), chalk.cyan('URL')],
          style: { head: [], border: [] },
          chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
        });
        table.push([host, chalk.cyan(port.toString()), `http://${host}:${port}`]);
        console.log(table.toString());
        console.log('');
        return;
      }
      spinner.text = `Scanning ${chalk.cyan(host)} for open ports...`;
      const tasks = ports.map(p => async () => {
        if (await checkPort(host, p)) return { host, port: p };
      });
      const results = await runTasks(tasks);
      spinner.stop();
      printResults(results, 'Web Servers');
    } else if (target && target.includes('/')) {
      const base = target.replace('/24', '');
      const baseSubnet = base.substring(0, base.lastIndexOf('.'));
      spinner.text = `Scanning subnet ${chalk.cyan(target)} on port 80...`;
      const tasks = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseSubnet}.${i}`;
        tasks.push(async () => {
          if (await checkPort(ip, 80)) return { host: ip, port: 80 };
        });
      }
      const results = await runTasks(tasks);
      spinner.stop();
      printResults(results, 'Web Servers');
    } else {
      const hosts = ['127.0.0.1', 'localhost', localIP];
      spinner.text = 'Scanning localhost...';
      const tasks = [];
      for (const host of hosts) {
        for (const port of ports) {
          tasks.push(async () => {
            if (await checkPort(host, port)) return { host, port };
          });
        }
      }
      let results = await runTasks(tasks);
      spinner.text = 'Scanning subnet (port 80)...';
      const subnetTasks = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        if (hosts.includes(ip)) continue;
        subnetTasks.push(async () => {
          if (await checkPort(ip, 80)) return { host: ip, port: 80 };
        });
      }
      results = results.concat(await runTasks(subnetTasks));
      spinner.stop();
      printResults(results, 'Local Web Servers');
    }

    function printResults(results, title) {
      console.log('');
      formatter.heading(title);
      if (results.length === 0) {
        console.log(`  ${chalk.yellow('No web servers found.\n')}`);
        return;
      }
      const Table = require('cli-table3');
      const table = new Table({
        head: [chalk.cyan('Host'), chalk.cyan('Port'), chalk.cyan('URL')],
        style: { head: [], border: [] },
        chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
      });
      for (const r of results) {
        table.push([r.host, chalk.cyan(r.port.toString()), `http://${r.host}:${r.port}`]);
      }
      console.log(table.toString());
      console.log('');
    }
  }
};

module.exports = websiteCommand;
