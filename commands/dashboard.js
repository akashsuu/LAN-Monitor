const chalk = require('chalk');
const { exec } = require('child_process');
const os = require('os');
const store = require('../config/store');
const internetService = require('../services/internet');
const trafficService = require('../services/traffic');
const network = require('../utils/network');
const formatter = require('../utils/formatter');

function repeat(char, n) {
  return Array(Math.max(0, n + 1)).join(char);
}

function progressBar(pct, width = 20) {
  const filled = Math.round(pct / 100 * width);
  const empty = width - filled;
  return chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty)) + ` ${Math.round(pct)}%`;
}

const dashboardCommand = {
  async execute(options) {
    if (options && options.live) {
      this.liveDashboard();
      return;
    }
    if (options && options.stop) {
      this.stop();
      return;
    }
    const config = store.getConfig();
    const port = config.dashboardPort || 3000;
    if (options && options.open) {
      this.open(port);
      return;
    }
    console.log(chalk.yellow('\n  Use: ln dashboard --live  for real-time terminal dashboard'));
    console.log(`  Use: ${chalk.cyan('ln dashboard --open')} to open web dashboard`);
    console.log(`  Use: ${chalk.cyan('ln dashboard --stop')} to stop the dashboard\n`);
  },

  liveDashboard() {
    let prevAlertCount = store.getAlerts().length;
    let prevDeviceCount = store.getDevices().length;
    let scanComplete = true;

    const render = async () => {
      const now = new Date().toLocaleTimeString();
      const devices = store.getDevices();
      const alerts = store.getAlerts();
      const config = store.getConfig();
      const nicknames = store.getNicknames();
      const traffic = trafficService.getTrafficSnapshot() || { uploadSpeed: 0, downloadSpeed: 0, cpuPercent: 0, memoryPercent: 0 };
      const avgTraffic = trafficService.getAverage();
      const groups = store.getGroups();

      const online = devices.filter(d => d.online || d.status);
      const offline = devices.filter(d => !d.online && !d.status);
      const trusted = devices.filter(d => d.mac && store.isTrusted(d.mac));
      const unknown = devices.filter(d => !d.vendor || d.vendor === 'Unknown');

      const onlineCount = online.length;
      const offlineCount = offline.length;
      const totalCount = devices.length;
      const trustedCount = trusted.length;
      const unknownCount = unknown.length;

      const connResult = await internetService.checkConnectivity().catch(() => ({ online: false }));
      const internetOK = connResult.online;

      const newAlerts = alerts.slice(0, 3);
      const recentJoins = devices.filter(d => {
        if (!d.firstSeen) return false;
        return Date.now() - new Date(d.firstSeen).getTime() < 300000;
      });
      const recentLeaves = devices.filter(d => {
        if (!d.online && d.lastSeen) {
          return Date.now() - new Date(d.lastSeen).getTime() < 300000;
        }
        return false;
      });

      const memPct = traffic.memoryPercent;
      const cpuPct = traffic.cpuPercent;
      const healthScore = Math.max(0, Math.min(100, 100 - (offlineCount * 5) - (internetOK ? 0 : 20) + (traffic.cpuPercent > 90 ? -10 : 0)));
      const gw = network.getGateway();

      process.stdout.write('\x1B[2J\x1B[0f');
      process.stdout.write('\n');
      process.stdout.write(chalk.bold.cyan(`  ${'\u2594'.repeat(Math.min(50, process.stdout.columns / 2 - 5 || 50))}\n`));
      process.stdout.write(chalk.bold.cyan(`  LAN MONITOR DASHBOARD`));
      process.stdout.write(chalk.dim(`  ${now}`));
      process.stdout.write('\n');
      process.stdout.write(chalk.bold.cyan(`  ${'\u2594'.repeat(Math.min(50, process.stdout.columns / 2 - 5 || 50))}\n`));
      process.stdout.write('\n');

      process.stdout.write(chalk.bold('  Gateway\n'));
      process.stdout.write(`   ${gw}\n`);
      process.stdout.write('\n');

      process.stdout.write(chalk.bold('  Devices\n'));
      process.stdout.write(`   ${chalk.green('\u25CF')} Online:  ${chalk.bold(onlineCount.toString().padStart(3))}${'   '}${chalk.red('\u25CB')} Offline: ${chalk.bold(offlineCount.toString().padStart(3))}\n`);
      process.stdout.write(`   ${chalk.yellow('\u2605')} Trusted: ${chalk.bold(trustedCount.toString().padStart(3))}${'   '}${chalk.gray('\u003F')} Unknown: ${chalk.bold(unknownCount.toString().padStart(3))}\n`);
      process.stdout.write(`   ${chalk.cyan('\u2261')} Groups:  ${chalk.bold(Object.keys(groups).length.toString().padStart(3))}${'   '}${chalk.dim('Total')}:   ${chalk.bold(totalCount.toString().padStart(3))}\n`);
      process.stdout.write('\n');

      process.stdout.write(chalk.bold('  Traffic\n'));
      process.stdout.write(`   ${chalk.cyan('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(traffic.uploadSpeed).padStart(12))}  (avg: ${chalk.dim(formatter.bitsPerSecond(avgTraffic.upload))})\n`);
      process.stdout.write(`   ${chalk.cyan('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(traffic.downloadSpeed).padStart(12))}  (avg: ${chalk.dim(formatter.bitsPerSecond(avgTraffic.download))})\n`);
      process.stdout.write('\n');

      process.stdout.write(chalk.bold('  System\n'));
      process.stdout.write(`   ${chalk.yellow('\u2665')} Health:   ${healthScore >= 80 ? chalk.green(healthScore + '%') : healthScore >= 50 ? chalk.yellow(healthScore + '%') : chalk.red(healthScore + '%')}\n`);
      process.stdout.write(`   ${chalk.green('\u25A3')} CPU:      ${progressBar(cpuPct)}\n`);
      process.stdout.write(`   ${chalk.blue('\u25A3')} Memory:   ${progressBar(memPct)}\n`);
      process.stdout.write(`   Internet: ${internetOK ? chalk.green('\u2713 Connected') : chalk.red('\u2717 Disconnected')}\n`);
      process.stdout.write('\n');

      if (recentJoins.length > 0) {
        process.stdout.write(chalk.bold(`  Recently Joined (${recentJoins.length})\n`));
        for (const d of recentJoins.slice(0, 3)) {
          const nick = d.mac ? nicknames[d.mac.toUpperCase()] : '';
          const name = nick || d.hostname || d.ip;
          process.stdout.write(`   ${chalk.green('+')} ${name}\n`);
        }
        process.stdout.write('\n');
      }

      if (recentLeaves.length > 0) {
        process.stdout.write(chalk.bold(`  Recently Disconnected (${recentLeaves.length})\n`));
        for (const d of recentLeaves.slice(0, 3)) {
          const nick = d.mac ? nicknames[d.mac.toUpperCase()] : '';
          const name = nick || d.hostname || d.ip;
          process.stdout.write(`   ${chalk.red('-')} ${name}\n`);
        }
        process.stdout.write('\n');
      }

      if (newAlerts.length > 0) {
        process.stdout.write(chalk.bold('  Recent Alerts\n'));
        for (const a of newAlerts) {
          process.stdout.write(`   ${chalk.yellow('\u26A0')} ${a.message || a.type}\n`);
        }
        process.stdout.write('\n');
      }

      process.stdout.write(chalk.dim(`  Press Ctrl+C to exit\n`));
    };

    render();
    const timer = setInterval(render, 2000);

    process.on('SIGINT', () => {
      clearInterval(timer);
      process.stdout.write('\x1B[2J\x1B[0f');
      console.log(chalk.yellow('\n  Dashboard closed.\n'));
      process.exit(0);
    });
  },

  open(port) {
    console.log(chalk.yellow(`\n  To open dashboard, navigate to:`));
    console.log(`  ${chalk.cyan(`  http://localhost:${port}`)}\n`);
    try {
      const url = `http://localhost:${port}`;
      const platform = process.platform;
      if (platform === 'win32') {
        exec(`start ${url}`);
      } else if (platform === 'darwin') {
        exec(`open ${url}`);
      } else {
        exec(`xdg-open ${url}`);
      }
    } catch {
      console.log(chalk.yellow('  Could not open browser automatically.'));
    }
  },

  stop() {
    console.log(chalk.yellow('\n  To stop, press Ctrl+C in the terminal running the dashboard.\n'));
  }
};

module.exports = dashboardCommand;
