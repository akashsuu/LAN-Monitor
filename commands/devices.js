const chalk = require('chalk');
const ora = require('ora');
const store = require('../config/store');
const scanService = require('../services/scan');

const devicesCommand = {
  async list(options) {
    const spinner = ora({
      text: 'Refreshing device list...',
      color: 'cyan'
    }).start();

    const arpDevices = await scanService.scanArp();
    for (const arp of arpDevices) {
      store.addDevice({
        ip: arp.ip,
        hostname: arp.hostname || '',
        mac: arp.mac || '',
        vendor: arp.vendor || '',
        status: true
      });
    }

    spinner.stop();

    let devices = store.getDevices();

    if (options && options.online) {
      devices = devices.filter(d => d.status === true);
    } else if (options && options.offline) {
      devices = devices.filter(d => d.status === false || d.status === undefined);
    }

    if (devices.length === 0) {
      console.log(chalk.yellow('\n  No devices found.\n'));
      return;
    }

    console.log('');
    console.log(`  ${chalk.bold('Devices')} ${chalk.gray(`(${devices.length} total)`)}`);

    const Table = require('cli-table3');
    const table = new Table({
      head: [
        chalk.cyan('IP'),
        chalk.cyan('Hostname'),
        chalk.cyan('MAC'),
        chalk.cyan('Vendor'),
        chalk.cyan('Status'),
        chalk.cyan('Last Seen')
      ],
      style: { head: [], border: [] },
      chars: {
        'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557',
        'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D',
        'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C',
        'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502'
      }
    });

    for (const device of devices) {
      const status = device.status ? chalk.green('Online') : chalk.red('Offline');
      const lastSeen = device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : chalk.gray('-');
      table.push([
        chalk.cyan(device.ip || '?'),
        device.hostname || chalk.gray('-'),
        device.mac || chalk.gray('-'),
        device.vendor || chalk.gray('-'),
        status,
        lastSeen
      ]);
    }

    console.log(table.toString());
    console.log('');
  },

  async detail(ip) {
    const spinner = ora({ text: `Looking up device ${chalk.cyan(ip)}...`, color: 'cyan' }).start();

    const arpDevices = await scanService.scanArp();
    const device = arpDevices.find(d => d.ip === ip) || {};
    const stored = store.getDevices().find(d => d.ip === ip);

    spinner.stop();

    if (!device.ip && !stored) {
      console.log(chalk.yellow(`\n  Device ${ip} not found.\n`));
      return;
    }

    console.log('');
    console.log(`  ${chalk.bold('Device Details')} ${chalk.gray('- ' + ip)}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(40))}`);

    const info = device.ip ? device : stored;
    console.log(`  ${chalk.bold('IP Address'.padEnd(15))} ${info.ip || chalk.gray('N/A')}`);
    console.log(`  ${chalk.bold('Hostname'.padEnd(15))} ${info.hostname || chalk.gray('N/A')}`);
    console.log(`  ${chalk.bold('MAC Address'.padEnd(15))} ${info.mac || chalk.gray('N/A')}`);
    console.log(`  ${chalk.bold('Vendor'.padEnd(15))} ${info.vendor || chalk.gray('N/A')}`);
    console.log(`  ${chalk.bold('Status'.padEnd(15))} ${info.status !== false ? chalk.green('Online') : chalk.red('Offline')}`);

    if (stored && stored.lastSeen) {
      console.log(`  ${chalk.bold('First Seen'.padEnd(15))} ${new Date(stored.firstSeen).toLocaleString()}`);
      console.log(`  ${chalk.bold('Last Seen'.padEnd(15))} ${new Date(stored.lastSeen).toLocaleString()}`);
    }
    console.log('');
  }
};

module.exports = devicesCommand;
