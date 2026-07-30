const chalk = require('chalk');
const Table = require('cli-table3');
const network = require('../utils/network');
const pingService = require('../services/ping');
const scanService = require('../services/scan');
const store = require('../config/store');
const vendor = require('../services/vendor');

async function getDeviceInfo(ip) {
  const info = { ip };

  info.hostname = await network.getHostname(ip).catch(() => '');

  try {
    const pingResult = await pingService.ping(ip);
    info.latency = pingResult.latency;
    info.reachable = pingResult.alive;
  } catch {
    info.latency = null;
    info.reachable = false;
  }

  const devices = store.getDevices();
  const saved = devices.find(d => d.ip === ip);
  if (saved) {
    info.mac = saved.mac;
    info.vendor = saved.vendor;
    info.firstSeen = saved.firstSeen;
    info.lastSeen = saved.lastSeen;
    info.deviceType = saved.deviceType;
    info.nickname = store.getNicknames()[saved.mac ? saved.mac.toUpperCase() : ''] || '';
    info.trusted = saved.mac ? store.isTrusted(saved.mac) : false;
  }

  if (!info.vendor && info.mac) {
    info.vendor = vendor.lookupVendor(info.mac);
  }

  return info;
}

const infoCommand = {
  async execute(ip) {
    if (!ip) {
      console.log(chalk.yellow('\n  Usage: ln info <ip-address>\n'));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Device Information: ${ip}\n`));

    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const spin = setInterval(() => {
      process.stdout.write(`\r  ${chalk.dim('Gathering information')} ${spinner[i++]}`);
      i %= spinner.length;
    }, 100);

    const info = await getDeviceInfo(ip);
    clearInterval(spin);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    const table = new Table({
      style: { head: ['cyan'], border: ['gray'] },
      colWidths: [18, 50]
    });

    table.push(['IP Address', info.ip]);
    table.push(['Hostname', info.hostname || chalk.dim('N/A')]);
    table.push(['MAC Address', info.mac || chalk.dim('N/A')]);
    table.push(['Vendor', info.vendor || chalk.dim('N/A')]);
    table.push(['Status', info.reachable ? chalk.green('Online') : chalk.red('Offline')]);
    if (info.latency !== null) {
      table.push(['Latency', `${info.latency.toFixed(1)} ms`]);
    }
    if (info.nickname) {
      table.push(['Nickname', chalk.yellow(info.nickname)]);
    }
    table.push(['Trusted', info.trusted ? chalk.green('Yes') : chalk.dim('No')]);
    if (info.firstSeen) {
      table.push(['First Seen', new Date(info.firstSeen).toLocaleString()]);
    }
    if (info.lastSeen) {
      table.push(['Last Seen', new Date(info.lastSeen).toLocaleString()]);
    }
    if (info.deviceType) {
      table.push(['Device Type', info.deviceType]);
    }

    console.log(table.toString());
    console.log();
  }
};

module.exports = infoCommand;
