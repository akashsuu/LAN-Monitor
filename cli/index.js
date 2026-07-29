const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

const pingCommand = require('../commands/ping');
const scanCommand = require('../commands/scan');
const devicesCommand = require('../commands/devices');
const websiteCommand = require('../commands/website');
const serverCommand = require('../commands/server');
const portCommand = require('../commands/port');
const ethernetCommand = require('../commands/ethernet');
const internetCommand = require('../commands/internet');
const dashboardCommand = require('../commands/dashboard');
const reportCommand = require('../commands/report');
const alertsCommand = require('../commands/alerts');
const configCommand = require('../commands/config');
const helpCommand = require('../commands/help');
const statusCommand = require('../commands/status');
const doctorCommand = require('../commands/doctor');
const updateCommand = require('../commands/update');

function createCLI() {
  program
    .name('ln')
    .description(chalk.cyan('LAN Monitor - Professional Network Monitoring CLI'))
    .version(packageJson.version, '-v, --version', 'Output the current version');

  program
    .command('help')
    .description('Display all available commands grouped by category')
    .action(() => helpCommand.execute());

  program
    .command('status')
    .description('Show overall system status')
    .action(() => statusCommand.execute());

  program
    .command('doctor')
    .description('Run diagnostics on the system')
    .action(() => doctorCommand.execute());

  program
    .command('update')
    .description('Check for updates')
    .action(() => updateCommand.execute());

  program
    .command('ping <host>')
    .description('Ping a host to check connectivity and latency')
    .action((host) => pingCommand.execute(host));

  program
    .command('scan')
    .description('Automatically scan local network')
    .option('-d, --deep', 'Perform a deep scan with additional details')
    .argument('[subnet]', 'Subnet to scan (e.g. 192.168.1.0/24)')
    .action((subnet, options) => scanCommand.execute(subnet, options));

  program
    .command('devices')
    .description('List all known devices')
    .option('--online', 'Show only online devices')
    .option('--offline', 'Show only offline devices')
    .action((options) => devicesCommand.list(options));

  program
    .command('device <ip>')
    .description('Show details for a specific device')
    .action((ip) => devicesCommand.detail(ip));

  program
    .command('website')
    .description('Manage monitored websites. Run without args to scan localhost for web servers')
    .argument('[command]', 'Subcommand: scan, add, remove, list, check, history')
    .argument('[arg]', 'URL or name for the subcommand')
    .action((command, arg) => {
      if (!command || command === 'scan') {
        websiteCommand.scanLocal();
        return;
      }
      const handlers = {
        add: (url) => websiteCommand.add(url),
        remove: (name) => websiteCommand.remove(name),
        list: () => websiteCommand.list(),
        check: (name) => websiteCommand.check(name),
        history: (name) => websiteCommand.history(name),
      };
      if (handlers[command]) {
        handlers[command](arg);
      } else {
        console.log(chalk.yellow('\n  Usage: ln website <command> [options]\n'));
        console.log(chalk.bold('  Commands:\n'));
        console.log('    scan      Scan localhost for running web servers');
        console.log('    add       Add a website to monitor');
        console.log('    remove    Remove a monitored website');
        console.log('    list      List all monitored websites');
        console.log('    check     Check a website status');
        console.log('    history   Show website monitoring history\n');
      }
    });

  program
    .command('server')
    .description('Manage monitored servers')
    .hook('preAction', (thisCommand) => {
      const subcommands = ['add', 'list', 'stats', 'remove'];
      if (!subcommands.includes(thisCommand.args[0])) {
        console.log(chalk.yellow('\n  Usage: ln server <command> [options]\n'));
        console.log(chalk.bold('  Commands:\n'));
        console.log('    add       Add a server to monitor');
        console.log('    list      List all monitored servers');
        console.log('    stats     Show server statistics');
        console.log('    remove    Remove a monitored server\n');
        process.exit(0);
      }
    })
    .argument('<command>', 'Subcommand: add, list, stats, remove')
    .argument('[arg]', 'IP address or name')
    .action((command, arg) => {
      const handlers = {
        add: (ip) => serverCommand.add(ip),
        list: () => serverCommand.list(),
        stats: (name) => serverCommand.stats(name),
        remove: (name) => serverCommand.remove(name),
      };
      if (handlers[command]) handlers[command](arg);
    });

  program
    .command('port')
    .description('Check port status and monitor ports')
    .hook('preAction', (thisCommand) => {
      const args = thisCommand.args;
      if (args[0] === 'monitor') return;
      if (args.length < 2) {
        console.log(chalk.yellow('\n  Usage: ln port <host> <port>\n'));
        console.log(chalk.bold('  Examples:\n'));
        console.log('    ln port localhost 25565');
        console.log('    ln port localhost 80');
        console.log('    ln ports localhost');
        console.log('    ln port monitor\n');
        process.exit(0);
      }
    })
    .argument('[host]', 'Hostname or IP address')
    .argument('[port]', 'Port number')
    .action((host, port) => {
      if (host === 'monitor') {
        portCommand.monitor();
      } else if (host && port) {
        portCommand.check(host, port);
      }
    });

  program
    .command('ports <host>')
    .description('Scan common ports on a host')
    .action((host) => portCommand.scan(host));

  program
    .command('ethernet')
    .description('Show ethernet/network adapter information')
    .option('--speed', 'Show connection speed')
    .option('--stats', 'Show network statistics')
    .option('--reset', 'Reset network adapter')
    .action((options) => ethernetCommand.execute(options));

  program
    .command('internet')
    .description('Show internet connection status and information')
    .action(() => internetCommand.status());

  program
    .command('publicip')
    .description('Show your public IP address')
    .action(() => internetCommand.publicIP());

  program
    .command('gateway')
    .description('Show default gateway information')
    .action(() => internetCommand.gateway());

  program
    .command('dns')
    .description('Show DNS information')
    .action(() => internetCommand.dns());

  program
    .command('speed')
    .description('Run a speed test')
    .action(() => internetCommand.speed());

  program
    .command('dashboard')
    .description('Start the React dashboard')
    .option('--open', 'Open dashboard in browser')
    .option('--stop', 'Stop the dashboard')
    .action((options) => dashboardCommand.execute(options));

  program
    .command('alerts')
    .description('Manage alerts')
    .option('--clear', 'Clear all alerts')
    .option('--enable', 'Enable alerts')
    .option('--disable', 'Disable alerts')
    .action((options) => alertsCommand.execute(options));

  program
    .command('report')
    .description('Generate network reports')
    .argument('[period]', 'Report period: today, week, month')
    .action((period) => reportCommand.generate(period || 'today'));

  program
    .command('export')
    .description('Export data')
    .argument('<format>', 'Export format: pdf, csv')
    .action((format) => reportCommand.export(format));

  program
    .command('config')
    .description('Manage configuration')
    .hook('preAction', (thisCommand) => {
      const subcommands = ['show', 'set', 'reset'];
      const args = thisCommand.args;
      if (!args.length || !subcommands.includes(args[0])) {
        configCommand.show();
        process.exit(0);
      }
    })
    .argument('[command]', 'Subcommand: show, set, reset')
    .argument('[key]', 'Config key')
    .argument('[value]', 'Config value')
    .action((command, key, value) => {
      const handlers = {
        show: () => configCommand.show(),
        set: (k, v) => configCommand.set(k, v),
        reset: () => configCommand.reset(),
      };
      if (handlers[command]) handlers[command](key, value);
    });

  program.parse(process.argv);
}

module.exports = { createCLI };
