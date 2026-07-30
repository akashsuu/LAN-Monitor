const chalk = require('chalk');
const os = require('os');
const store = require('../config/store');
const formatter = require('../utils/formatter');
const system = require('../utils/system');
const network = require('../utils/network');
const htmlReportService = require('../services/htmlreport');

const reportCommand = {
  generate(period) {
    if (period === 'html') {
      this.htmlReport();
      return;
    }
    const validPeriods = ['today', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      console.log(chalk.red(`  Invalid period: ${period}. Use: today, week, month`));
      return;
    }
    const history = store.getHistory();
    const now = new Date();
    let cutoff;
    switch (period) {
      case 'today':
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 86400000);
        break;
    }
    const filtered = history.filter(e => new Date(e.timestamp) >= cutoff);
    const devices = store.getDevices();
    const websites = store.getWebsites();
    console.log('');
    formatter.heading(`Network Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`);
    console.log(`  ${chalk.gray(`Generated: ${now.toLocaleString()}`)}`);
    console.log(`  ${chalk.gray(`Host: ${os.hostname()}`)}`);
    formatter.divider();
    formatter.labelValue('Devices Found', `${devices.length}`);
    formatter.labelValue('Websites Monitored', `${websites.length}`);
    formatter.labelValue('Events Recorded', `${filtered.length}`);
    const onlineDevices = devices.filter(d => d.status).length;
    const offlineDevices = devices.filter(d => !d.status).length;
    formatter.labelValue('Online Devices', chalk.green(`${onlineDevices}`));
    formatter.labelValue('Offline Devices', offlineDevices > 0 ? chalk.red(`${offlineDevices}`) : chalk.green('0'));
    formatter.divider();
    const uptime = system.getUptime();
    formatter.labelValue('System Uptime', uptime);
    formatter.labelValue('Local IP', network.getLocalIP());
    formatter.labelValue('Gateway', network.getGateway());
    if (filtered.length > 0) {
      formatter.divider();
      formatter.heading('Recent Events');
      filtered.slice(0, 10).forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleString();
        const status = entry.status ? chalk.green('\u2713') : chalk.red('\u2717');
        console.log(`  ${status} ${chalk.gray(time)} - ${entry.type}: ${entry.target}`);
      });
    }
    console.log('');
  },

  export(format) {
    const validFormats = ['pdf', 'csv'];
    if (!validFormats.includes(format)) {
      console.log(chalk.red(`  Invalid format: ${format}. Use: pdf, csv`));
      return;
    }
    const history = store.getHistory();
    console.log('');
    formatter.heading(`Export - ${format.toUpperCase()}`);
    if (format === 'csv') {
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(os.homedir(), '.lan-monitor');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      const filePath = path.join(exportDir, 'export.csv');
      let csv = 'Type,Target,Status,Latency,Timestamp\n';
      for (const entry of history.slice(0, 500)) {
        const status = entry.status ? 'Online' : 'Offline';
        const latency = entry.latency !== null ? `${entry.latency.toFixed(0)}ms` : 'N/A';
        csv += `${entry.type},${entry.target},${status},${latency},${entry.timestamp}\n`;
      }
      fs.writeFileSync(filePath, csv, 'utf8');
      console.log(`  ${chalk.green('\u2713')} CSV exported to: ${chalk.cyan(filePath)}`);
    } else {
      console.log(`  ${chalk.yellow('\u26A0 PDF export requires a PDF library integration.')}`);
      console.log(`  ${chalk.gray('  For now, use CSV export: ln export csv')}`);
    }
    console.log('');
  },

  htmlReport() {
    console.log('');
    formatter.heading('Generating HTML Report...');
    try {
      const filePath = htmlReportService.generate();
      console.log(`  ${chalk.green('\u2713')} Report saved: ${chalk.cyan(filePath)}\n`);
    } catch (err) {
      console.log(`  ${chalk.red('\u2717')} Failed: ${err.message}\n`);
    }
  }
};

module.exports = reportCommand;
