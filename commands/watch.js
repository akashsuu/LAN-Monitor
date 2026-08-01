const chalk = require('chalk');
const scanService = require('../services/scan');
const store = require('../config/store');
const logger = require('../services/logging');
const historyService = require('../services/history');
const formatter = require('../utils/formatter');

const watchService = {
  async execute(options) {
    const interval = (options && options.interval) || store.getConfig().watchInterval || 10;
    const duration = options && options.duration ? options.duration * 60 * 1000 : Infinity;
    const startTime = Date.now();

    console.log(chalk.cyan.bold('\n  Watch Mode Active\n'));
    console.log(chalk.dim(`  Interval: ${interval}s  |  Press Ctrl+C to stop\n`));

    const previous = {};

    const doScan = async () => {
      try {
        const subnet = scanService.getLocalSubnet();
        const devices = await scanService.scanNetwork(subnet);

        const current = {};
        for (const d of devices) {
          current[d.ip] = { mac: d.mac, hostname: d.hostname, vendor: d.vendor, status: d.status };
        }

        const newDevices = [];
        const goneDevices = [];

        for (const ip of Object.keys(current)) {
          if (!previous[ip]) {
            newDevices.push(current[ip]);
          }
        }

        for (const ip of Object.keys(previous)) {
          if (!current[ip]) {
            goneDevices.push(previous[ip]);
          }
        }

        const now = new Date().toLocaleTimeString();
        if (newDevices.length > 0 || goneDevices.length > 0) {
          process.stdout.cursorTo(0, 2);
          process.stdout.write('\x1B[J');
          console.log(chalk.cyan.bold('\n  Watch Mode Active\n'));
          console.log(chalk.dim(`  Interval: ${interval}s  |  Last scan: ${now}\n`));
        }

        for (const d of newDevices) {
          const mac = d.mac || 'N/A';
          console.log(`  ${chalk.green('+')} ${d.ip} ${chalk.dim(mac)} ${d.vendor ? chalk.cyan(d.vendor) : ''}`);
          store.addDevice({ ip: d.ip, mac: d.mac, hostname: d.hostname, vendor: d.vendor, status: true });
          historyService.recordDeviceChange(d, 'online');
        }

        for (const d of goneDevices) {
          console.log(`  ${chalk.red('-')} ${d.ip} ${chalk.dim(d.mac || 'N/A')}`);
          store.updateDevice(d.ip, { online: false });
          historyService.recordDeviceChange(d, 'offline');
        }

        if (newDevices.length === 0 && goneDevices.length === 0) {
          const onlineCount = devices.filter(d => d.status).length;
          process.stdout.write(`\r  ${chalk.dim(now)} ${onlineCount} devices online`);
        }

        Object.assign(previous, current);
        for (const ip of Object.keys(previous)) {
          if (!current[ip]) delete previous[ip];
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
          console.log(chalk.yellow('\n\n  Watch duration reached.'));
          process.exit(0);
        }
      } catch (err) {
        logger.error('Watch scan failed', { error: err.message });
      }
    };

    await doScan();
    const timer = setInterval(doScan, interval * 1000);

    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log(chalk.yellow('\n  Watch mode stopped.\n'));
      process.exit(0);
    });
  }
};

module.exports = watchService;
