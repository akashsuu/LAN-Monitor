const chalk = require('../utils/theme');
const os = require('os');
const pingService = require('../services/ping');
const internetService = require('../services/internet');
const system = require('../utils/system');
const formatter = require('../utils/formatter');
const store = require('../config/store');

const statusCommand = {
  async execute() {
    console.log('');
    formatter.heading('System Status');

    formatter.labelValue('Hostname', os.hostname());
    formatter.labelValue('Platform', `${os.platform()} ${os.release()}`);
    formatter.labelValue('Uptime', system.getUptime());
    formatter.labelValue('Node.js', process.version);

    const mem = system.getMemoryUsage();
    formatter.labelValue('Memory', `${formatter.bytes(mem.used)} / ${formatter.bytes(mem.total)} (${mem.percentage.toFixed(1)}%)`);
    formatter.labelValue('CPU', `${system.getCPUUsage().toFixed(1)}%`);

    formatter.divider();
    formatter.heading('Connectivity');

    const [pingResult, connectivity, publicInfo] = await Promise.all([
      pingService.ping('8.8.8.8', 2),
      internetService.checkConnectivity(),
      internetService.getPublicIP()
    ]);

    formatter.labelValue('Internet', connectivity.online ? chalk.green('Connected') : chalk.red('Disconnected'));
    formatter.labelValue('Public IP', publicInfo.ip);
    formatter.labelValue('Latency', pingResult.average ? `${pingResult.average.toFixed(1)} ms` : chalk.gray('N/A'));
    formatter.labelValue('Packet Loss', `${pingResult.packetLoss}%`);

    formatter.divider();
    formatter.heading('Monitored');

    const devices = store.getDevices();
    const websites = store.getWebsites();
    const servers = store.getServers();
    const alerts = store.getAlerts();

    formatter.labelValue('Devices', `${devices.length} tracked`);
    formatter.labelValue('Websites', `${websites.length} monitored`);
    formatter.labelValue('Servers', `${servers.length} monitored`);
    formatter.labelValue('Active Alerts', chalk.yellow(alerts.filter(a => !a.acknowledged).length));
    console.log('');
  }
};

module.exports = statusCommand;
