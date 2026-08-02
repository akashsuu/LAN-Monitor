const chalk = require('../utils/theme');
const ora = require('ora');
const ethernetService = require('../services/ethernet');
const formatter = require('../utils/formatter');

const ethernetCommand = {
  async execute(options) {
    if (options && options.reset) {
      await this.reset();
      return;
    }
    if (options && options.speed) {
      await this.speed();
      return;
    }
    if (options && options.stats) {
      await this.stats();
      return;
    }
    const spinner = ora({ text: 'Gathering ethernet information...', color: 'cyan' }).start();
    const adapter = ethernetService.getAdapterInfo();
    spinner.stop();
    console.log('');
    formatter.heading('Ethernet / Network Adapter');
    formatter.labelValue('Connection', adapter.type || 'Ethernet');
    formatter.labelValue('Adapter', adapter.name);
    formatter.divider();
    formatter.labelValue('IPv4 Address', adapter.ipv4 || chalk.gray('N/A'));
    formatter.labelValue('IPv6 Address', adapter.ipv6 || chalk.gray('N/A'));
    formatter.labelValue('Gateway', adapter.gateway);
    formatter.labelValue('DNS', adapter.dns);
    formatter.labelValue('Speed', adapter.speed);
    formatter.labelValue('MAC Address', adapter.mac);
    console.log('');
  },

  async speed() {
    const spinner = ora({ text: 'Measuring connection speed...', color: 'cyan' }).start();
    await new Promise(r => setTimeout(r, 1500));
    const adapter = ethernetService.getAdapterInfo();
    spinner.stop();
    console.log('');
    formatter.heading('Connection Speed');
    formatter.labelValue('Link Speed', adapter.speed);
    formatter.labelValue('Type', adapter.type || 'Ethernet');
    formatter.labelValue('Adapter', adapter.name);
    console.log('');
    formatter.labelValue('Upload', chalk.gray('Speed test requires full test suite'));
    formatter.labelValue('Download', chalk.gray('Speed test requires full test suite'));
    console.log('');
  },

  async stats() {
    const spinner = ora({ text: 'Gathering network statistics...', color: 'cyan' }).start();
    const stats = ethernetService.getStats();
    spinner.stop();
    console.log('');
    formatter.heading('Network Statistics');
    formatter.labelValue('Bytes Sent', formatter.bytes(stats.sent));
    formatter.labelValue('Bytes Received', formatter.bytes(stats.received));
    if (stats.packetsSent > 0) {
      formatter.labelValue('Packets Sent', stats.packetsSent.toLocaleString());
      formatter.labelValue('Packets Received', stats.packetsReceived.toLocaleString());
    }
    console.log('');
  },

  async reset() {
    const spinner = ora({ text: 'Resetting network adapter...', color: 'yellow' }).start();
    const result = await ethernetService.resetAdapter();
    spinner.stop();
    console.log('');
    if (result.success) {
      console.log(`  ${chalk.green('\u2713 Network adapter reset successfully.')}\n`);
    } else {
      console.log(`  ${chalk.red('\u2717 Reset failed:')} ${result.error}\n`);
    }
  }
};

module.exports = ethernetCommand;
