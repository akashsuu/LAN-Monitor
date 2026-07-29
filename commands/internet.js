const chalk = require('chalk');
const ora = require('ora');
const internetService = require('../services/internet');
const pingService = require('../services/ping');
const dnsService = require('../services/dns');
const network = require('../utils/network');
const formatter = require('../utils/formatter');

const internetCommand = {
  async status() {
    const spinner = ora({ text: 'Checking internet connection...', color: 'cyan' }).start();
    const [connectivity, publicIP, pingResult, dnsResult] = await Promise.all([
      internetService.checkConnectivity(),
      internetService.getPublicIP(),
      pingService.ping('8.8.8.8', 2),
      dnsService.measureLatency('google.com')
    ]);
    spinner.stop();
    console.log('');
    formatter.heading('Internet Status');
    formatter.labelValue('Status', connectivity.online ? chalk.green('Connected') : chalk.red('Disconnected'));
    formatter.labelValue('Public IP', publicIP.ip);
    formatter.divider();
    formatter.labelValue('Ping (8.8.8.8)', pingResult.average !== null ? formatter.ms(pingResult.average) : chalk.gray('N/A'));
    formatter.labelValue('Packet Loss', formatter.packetLoss(pingResult.packetLoss));
    formatter.labelValue('DNS Latency', dnsResult.latency !== null ? formatter.ms(dnsResult.latency) : chalk.gray('N/A'));
    formatter.labelValue('Gateway', network.getGateway());
    formatter.labelValue('DNS Server', network.getDNS());
    console.log('');
  },

  async publicIP() {
    const spinner = ora({ text: 'Fetching public IP...', color: 'cyan' }).start();
    const result = await internetService.getPublicIP();
    const info = await internetService.getPublicInfo();
    spinner.stop();
    console.log('');
    formatter.heading('Public IP Information');
    formatter.labelValue('IP Address', result.ip);
    if (info.city && info.city !== 'Unknown') {
      formatter.labelValue('Location', `${info.city}, ${info.region}, ${info.country_name}`);
      formatter.labelValue('ISP', info.org);
    }
    console.log('');
  },

  async gateway() {
    const spinner = ora({ text: 'Finding default gateway...', color: 'cyan' }).start();
    const gw = network.getGateway();
    spinner.stop();
    console.log('');
    formatter.heading('Default Gateway');
    formatter.labelValue('Gateway', gw);
    formatter.labelValue('Local IP', network.getLocalIP());
    console.log('');
  },

  async dns() {
    const spinner = ora({ text: 'Gathering DNS information...', color: 'cyan' }).start();
    const dnsServer = network.getDNS();
    const dnsResult = await dnsService.measureLatency('google.com');
    const lookup = await dnsService.lookup('google.com');
    spinner.stop();
    console.log('');
    formatter.heading('DNS Information');
    formatter.labelValue('DNS Server', dnsServer);
    formatter.labelValue('DNS Latency', dnsResult.latency !== null ? formatter.ms(dnsResult.latency) : chalk.gray('N/A'));
    formatter.labelValue('google.com', lookup.addresses.length > 0 ? lookup.addresses[0] : chalk.red('Failed'));
    console.log('');
  },

  async speed() {
    console.log('');
    formatter.heading('Speed Test');
    console.log(`  ${chalk.yellow('\u26A0 Speed test requires full integration.')}`);
    console.log(`  ${chalk.gray('  Use a dedicated speed test tool for accurate results.')}`);
    console.log('');
  }
};

module.exports = internetCommand;
