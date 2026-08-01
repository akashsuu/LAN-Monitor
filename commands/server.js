const chalk = require('chalk');
const net = require('net');
const ora = require('ora');
const store = require('../config/store');
const portService = require('../services/port');
const pingService = require('../services/ping');
const formatter = require('../utils/formatter');
const network = require('../utils/network');

const serverCommand = {
  add(ip) {
    if (!ip) {
      console.log(chalk.red('  Error: Please provide an IP address.'));
      return;
    }
    const added = store.addServer(ip);
    if (added) {
      console.log(chalk.green(`\n  \u2713 Added server: ${chalk.cyan(ip)}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Server already monitored: ${ip}\n`));
    }
  },

  list() {
    const servers = store.getServers();
    if (servers.length === 0) {
      console.log(chalk.yellow('\n  No servers being monitored.\n'));
      return;
    }
    console.log('');
    console.log(`  ${chalk.bold('Monitored Servers')} ${chalk.gray(`(${servers.length})`)}`);
    const Table = require('cli-table3');
    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('IP'), chalk.cyan('Added')],
      style: { head: [], border: [] },
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });
    for (const srv of servers) {
      table.push([srv.name || srv.ip, formatter.deviceIP(srv.ip), new Date(srv.added).toLocaleDateString()]);
    }
    console.log(table.toString());
    console.log('');
  },

  async stats(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a server name.'));
      return;
    }
    const servers = store.getServers();
    const server = servers.find(s => s.name === name || s.ip === name);
    if (!server) {
      console.log(chalk.yellow(`\n  \u26A0 Server not found: ${name}\n`));
      return;
    }
    const spinner = ora({ text: `Checking server ${chalk.cyan(server.ip)}...`, color: 'cyan' }).start();
    const [pingResult, portResult] = await Promise.all([
      pingService.ping(server.ip, 2),
      portService.checkPort(server.ip, 80)
    ]);
    spinner.stop();
    console.log('');
    formatter.heading(`Server Stats - ${server.name || server.ip}`);
    formatter.labelValue('IP', server.ip);
    formatter.labelValue('Ping', pingResult.average !== null ? formatter.ms(pingResult.average) : chalk.gray('N/A'));
    formatter.labelValue('Packet Loss', formatter.packetLoss(pingResult.packetLoss));
    formatter.labelValue('Status', pingResult.online ? chalk.green('Online') : chalk.red('Offline'));
    formatter.labelValue('Port 80', portResult.open ? chalk.green('Open') : chalk.red('Closed'));
    console.log('');
  },

  remove(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a server name or IP.'));
      return;
    }
    const removed = store.removeServer(name);
    if (removed) {
      console.log(chalk.green(`\n  \u2713 Removed server: ${chalk.cyan(name)}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Server not found: ${name}\n`));
    }
  },

  async scanLocal(target) {
    const localIP = network.getLocalIP();
    const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
    const CONCURRENCY = 100;

    const SERVER_PORTS = [
      { port: 21, name: 'FTP' },
      { port: 22, name: 'SSH' },
      { port: 23, name: 'Telnet' },
      { port: 25, name: 'SMTP' },
      { port: 53, name: 'DNS' },
      { port: 80, name: 'HTTP' },
      { port: 110, name: 'POP3' },
      { port: 143, name: 'IMAP' },
      { port: 443, name: 'HTTPS' },
      { port: 445, name: 'SMB' },
      { port: 993, name: 'IMAPS' },
      { port: 995, name: 'POP3S' },
      { port: 1433, name: 'MSSQL' },
      { port: 1521, name: 'Oracle' },
      { port: 2049, name: 'NFS' },
      { port: 3306, name: 'MySQL' },
      { port: 3389, name: 'RDP' },
      { port: 5432, name: 'PostgreSQL' },
      { port: 5900, name: 'VNC' },
      { port: 6379, name: 'Redis' },
      { port: 8080, name: 'HTTP-Alt' },
      { port: 8443, name: 'HTTPS-Alt' },
      { port: 27017, name: 'MongoDB' },
      { port: 25565, name: 'Minecraft' }
    ];

    const checkPort = (host, port) => new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, host);
    });

    async function runTasks(tasks) {
      const results = [];
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(fn => fn()));
        results.push(...batchResults.filter(Boolean));
      }
      return results;
    }

    const spinner = ora({ text: 'Scanning for servers...', color: 'cyan' }).start();
    const results = [];

    if (target) {
      const parts = target.split(':');
      const host = parts[0];
      if (parts.length === 2) {
        const port = parseInt(parts[1], 10);
        spinner.text = `Checking ${chalk.cyan(target)}...`;
        const open = await checkPort(host, port);
        spinner.stop();
        if (!open) { console.log(chalk.yellow('\n  Port closed or no response.\n')); return; }
        console.log('');
        formatter.heading('Server Found');
        const service = SERVER_PORTS.find(p => p.port === port);
        console.log(`  ${chalk.bold('Host'.padEnd(18))} ${host}`);
        console.log(`  ${chalk.bold('Port'.padEnd(18))} ${port} (${service ? service.name : 'Unknown'})`);
        console.log('');
        return;
      }
      spinner.text = `Scanning ${chalk.cyan(host)} for open ports...`;
      const tasks = SERVER_PORTS.map(p => async () => {
        if (await checkPort(host, p.port)) return { host, port: p.port, service: p.name };
      });
      const portResults = await runTasks(tasks);
      spinner.stop();
      printResults(portResults, `Servers on ${host}`);
    } else {
      spinner.text = 'Scanning localhost for servers...';
      const hosts = ['127.0.0.1', 'localhost', localIP];
      const tasks = [];
      for (const host of hosts) {
        for (const p of SERVER_PORTS) {
          tasks.push(async () => {
            if (await checkPort(host, p.port)) return { host, port: p.port, service: p.name };
          });
        }
      }
      results.push(...await runTasks(tasks));

      spinner.text = 'Scanning subnet for servers (port 22, 80, 443, 3389)...';
      const quickPorts = [22, 80, 443, 3389];
      const subnetTasks = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        if (hosts.includes(ip) || ip === localIP) continue;
        for (const port of quickPorts) {
          subnetTasks.push(async () => {
            if (await checkPort(ip, port)) {
              const svc = SERVER_PORTS.find(p => p.port === port);
              return { host: ip, port, service: svc ? svc.name : 'Unknown' };
            }
          });
        }
      }
      results.push(...await runTasks(subnetTasks));
      spinner.stop();
      printResults(results, 'Local Servers');
    }

    function printResults(portResults, title) {
      console.log('');
      formatter.heading(title);
      if (portResults.length === 0) {
        console.log(`  ${chalk.yellow('No servers found.\n')}`);
        return;
      }
      const Table = require('cli-table3');
      const table = new Table({
        head: [chalk.cyan('Host'), chalk.cyan('Port'), chalk.cyan('Service')],
        style: { head: [], border: [] },
        chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
      });
      for (const r of portResults) {
        table.push([r.host, chalk.cyan(r.port.toString()), r.service]);
      }
      console.log(table.toString());
      console.log('');
    }
  }
};

module.exports = serverCommand;
