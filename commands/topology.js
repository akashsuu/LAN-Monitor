const chalk = require('chalk');
const Table = require('cli-table3');
const os = require('os');
const network = require('../utils/network');
const scanService = require('../services/scan');
const store = require('../config/store');

const topologyCommand = {
  async execute() {
    console.log(chalk.cyan.bold('\n  Network Topology\n'));

    const localIP = network.getLocalIP();
    const gateway = network.getGateway();
    const subnet = scanService.getLocalSubnet();

    console.log(`  ${chalk.bold('Local IP:')}    ${localIP}`);
    console.log(`  ${chalk.bold('Gateway:')}     ${gateway || 'N/A'}`);
    console.log(`  ${chalk.bold('Subnet:')}      ${subnet}`);
    console.log();

    const devices = store.getDevices();
    const online = devices.filter(d => d.online || d.status);

    if (devices.length === 0) {
      console.log(chalk.dim('  Run "ln scan" first to discover devices.\n'));
      return;
    }

    const gwIP = gateway || subnet.replace('0/24', '1');

    const gwDevice = devices.find(d => d.ip === gwIP);
    const gwVendor = gwDevice ? (gwDevice.vendor || 'Unknown') : 'Unknown';

    console.log(`  ${chalk.bold('Routing Path:')}\n`);
    console.log(`    [You] ${chalk.cyan(localIP)}`);
    console.log(`       |`);
    console.log(`    [Gateway] ${chalk.yellow(gwIP)} ${chalk.dim(gwVendor)}`);
    console.log(`       |`);
    console.log(`    ${chalk.dim('[Internet]')}`);
    console.log();

    console.log(`  ${chalk.bold('Connected Devices:')}\n`);

    const sorted = [...devices].sort((a, b) => {
      const aParts = (a.ip || '').split('.');
      const bParts = (b.ip || '').split('.');
      const aNum = parseInt(aParts[3], 10) || 0;
      const bNum = parseInt(bParts[3], 10) || 0;
      return aNum - bNum;
    });

    const treeLines = [];
    let hasSwitch = false;

    for (const d of sorted) {
      if (d.ip === localIP || d.ip === gwIP) continue;
      const isOnline = d.online || d.status;
      const statusIcon = isOnline ? chalk.green('●') : chalk.red('○');
      const vendorStr = d.vendor ? chalk.dim(` (${d.vendor})`) : '';
      const nameStr = d.hostname || d.mac || '';
      const shortName = nameStr.length > 20 ? nameStr.substring(0, 20) + '…' : nameStr;
      treeLines.push(`    ${statusIcon} ${d.ip} ${chalk.cyan(d.mac ? d.mac : '')}${vendorStr} ${shortName ? chalk.dim(shortName) : ''}`);
      if (!hasSwitch && d.vendor && ['cisco', 'netgear', 'tp-link', 'd-link', 'linksys', 'ubiquiti', 'aruba', 'hp'].some(v => (d.vendor || '').toLowerCase().includes(v))) {
        hasSwitch = true;
      }
    }

    if (hasSwitch) {
      console.log(`    ${chalk.yellow('┬')}─── ${chalk.bold('Switch / AP')}`);
      console.log(`    ${chalk.yellow('│')}`);
    }

    const lines = treeLines.slice(0, 20);
    for (const line of lines) {
      console.log(line);
    }
    if (treeLines.length > 20) {
      console.log(chalk.dim(`    ... and ${treeLines.length - 20} more devices`));
    }

    console.log();
    const onlineCount = online.length;
    const totalCount = devices.length;
    console.log(`  ${chalk.bold('Summary:')} ${onlineCount}/${totalCount} devices online`);
    console.log();
  }
};

module.exports = topologyCommand;
