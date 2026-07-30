const chalk = require('chalk');
const Table = require('cli-table3');
const store = require('../config/store');
const vendor = require('../services/vendor');

function normalize(s) {
  return String(s || '').toLowerCase();
}

const findCommand = {
  async execute(keyword) {
    if (!keyword) {
      console.log(chalk.yellow('\n  Usage: ln find <keyword>\n'));
      console.log(chalk.bold('  Search by IP, MAC, vendor, hostname, nickname, device type, OS, status, trusted, group\n'));
      return;
    }

    const kw = normalize(keyword);
    const devices = store.getDevices();
    const nicknames = store.getNicknames();
    const groups = store.getGroups();

    const results = [];
    const matchedReasons = new Map();

    for (const d of devices) {
      const reasons = [];
      const ip = normalize(d.ip);
      const mac = normalize(d.mac);
      const hostname = normalize(d.hostname);
      const devVendor = normalize(d.vendor);
      const devType = normalize(d.deviceType);
      const os = normalize(d.os);
      const nick = d.mac ? normalize(nicknames[d.mac.toUpperCase()] || '') : '';
      let status = '';
      if (d.online || d.status) status = 'online';
      else status = 'offline';
      const trusted = d.mac ? store.isTrusted(d.mac) : false;

      if (ip.includes(kw)) reasons.push('IP');
      else if (mac.includes(kw)) reasons.push('MAC');
      else if (hostname.includes(kw)) reasons.push('Hostname');
      else if (devVendor.includes(kw)) reasons.push('Vendor');
      else if (devType.includes(kw)) reasons.push('Device Type');
      else if (os.includes(kw)) reasons.push('OS');
      else if (nick.includes(kw)) reasons.push('Nickname');
      else if (status.includes(kw)) reasons.push('Status');
      else if (trusted && (kw === 'trusted' || kw === 'trust')) reasons.push('Trusted');

      if (!reasons.length) {
        for (const [gname, gdata] of Object.entries(groups)) {
          if (gdata.devices.includes(d.ip) && normalize(gname).includes(kw)) {
            reasons.push(`Group: ${gname}`);
            break;
          }
        }
      }

      if (reasons.length > 0) {
        results.push(d);
        matchedReasons.set(d.ip, reasons.join(', '));
      }
    }

    if (results.length === 0) {
      console.log(chalk.yellow(`\n  No devices found matching "${keyword}".\n`));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Search Results: "${keyword}" (${results.length} matches)\n`));

    const table = new Table({
      head: [chalk.cyan('IP'), chalk.cyan('MAC'), chalk.cyan('Vendor'), chalk.cyan('Nickname'), chalk.cyan('Status'), chalk.cyan('Match')],
      style: { head: [], border: [] },
      colWidths: [16, 18, 14, 14, 9, 16],
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });

    for (const d of results) {
      const nick = d.mac ? nicknames[d.mac.toUpperCase()] : '';
      const status = (d.online || d.status) ? chalk.green('Online') : chalk.red('Offline');
      table.push([
        chalk.cyan(d.ip || '?'),
        d.mac || chalk.gray('-'),
        d.vendor || chalk.gray('-'),
        nick || chalk.gray('-'),
        status,
        chalk.yellow(matchedReasons.get(d.ip) || '')
      ]);
    }

    console.log(table.toString());
    console.log();
  }
};

module.exports = findCommand;
