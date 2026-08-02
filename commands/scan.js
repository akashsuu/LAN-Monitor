const chalk = require('../utils/theme');
const ora = require('ora');
const scanService = require('../services/scan');
const store = require('../config/store');
const formatter = require('../utils/formatter');

const scanCommand = {
  async execute(subnet, options) {
    const spinner = ora({
      text: `Scanning network ${subnet ? chalk.cyan(subnet) : '(auto)'}...`,
      color: 'cyan'
    }).start();

    try {
      const devices = await scanService.scanNetwork(subnet);
      spinner.stop();

      if (!devices || devices.length === 0) {
        console.log(chalk.yellow('\n  No devices found on the network.\n'));
        return;
      }

      console.log('');
      formatter.heading('Network Scan Results');
      console.log(`  ${chalk.gray(`Found ${chalk.white(devices.length)} device(s)`)}\n`);

      const Table = require('cli-table3');
      const table = new Table({
        head: [
          chalk.cyan('IP'),
          chalk.cyan('Hostname'),
          chalk.cyan('MAC'),
          chalk.cyan('Vendor'),
          chalk.cyan('Status')
        ],
        style: { head: [], border: [] },
        chars: {
          'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557',
          'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D',
          'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C',
          'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502'
        }
      });

      const displayedIps = new Set();
      for (const device of devices) {
        if (displayedIps.has(device.ip)) continue;
        displayedIps.add(device.ip);
        const status = device.status !== false ? chalk.green('Online') : chalk.red('Offline');
        table.push([
          formatter.deviceIP(device.ip),
          device.hostname || chalk.gray('-'),
          device.mac || chalk.gray('-'),
          device.vendor || chalk.gray('-'),
          status
        ]);

        if (device.status !== false) {
          store.addDevice({
            ip: device.ip,
            hostname: device.hostname || '',
            mac: device.mac || '',
            vendor: device.vendor || '',
            status: true
          });
        }
      }

      console.log(table.toString());
      console.log('');
    } catch (err) {
      spinner.stop();
      console.log(chalk.red(`\n  Scan failed: ${err.message}\n`));
    }
  }
};

module.exports = scanCommand;
