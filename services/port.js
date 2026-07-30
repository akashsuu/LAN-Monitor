const net = require('net');
const store = require('../config/store');

const COMMON_PORTS = [
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

const TOP100_PORTS = [
  { port: 21, name: 'FTP' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 25, name: 'SMTP' },
  { port: 53, name: 'DNS' },
  { port: 80, name: 'HTTP' },
  { port: 110, name: 'POP3' },
  { port: 111, name: 'RPC' },
  { port: 135, name: 'RPC' },
  { port: 139, name: 'NetBIOS' },
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
  { port: 8443, name: 'HTTPS-Alt' },
  { port: 9000, name: 'SonarQube' },
  { port: 9090, name: 'Prometheus' },
  { port: 9200, name: 'Elasticsearch' },
  { port: 11211, name: 'Memcached' },
  { port: 27017, name: 'MongoDB' },
  { port: 25565, name: 'Minecraft' },
  { port: 5000, name: 'Flask' },
  { port: 5001, name: 'Synology' },
  { port: 3000, name: 'Node.js' },
  { port: 3001, name: 'Node.js' },
  { port: 4000, name: 'Node.js' },
  { port: 8000, name: 'HTTP-Alt' },
  { port: 8888, name: 'HTTP-Alt' },
  { port: 10000, name: 'Webmin' },
  { port: 32400, name: 'Plex' },
  { port: 8333, name: 'Bitcoin' },
  { port: 6667, name: 'IRC' },
  { port: 6660, name: 'IRC' },
  { port: 1723, name: 'PPTP' },
  { port: 1194, name: 'OpenVPN' },
  { port: 5060, name: 'SIP' },
  { port: 5061, name: 'SIP-TLS' },
  { port: 5222, name: 'XMPP' },
  { port: 5223, name: 'XMPP' },
  { port: 5269, name: 'XMPP' },
  { port: 3478, name: 'STUN' },
  { port: 5349, name: 'STUN-TLS' },
  { port: 123, name: 'NTP' },
  { port: 69, name: 'TFTP' },
  { port: 179, name: 'BGP' },
  { port: 389, name: 'LDAP' },
  { port: 636, name: 'LDAPS' },
  { port: 873, name: 'Rsync' },
  { port: 993, name: 'IMAPS' },
  { port: 995, name: 'POP3S' },
  { port: 119, name: 'NNTP' },
  { port: 563, name: 'NNTPS' },
  { port: 6789, name: 'Camp' },
  { port: 8081, name: 'Proxy' },
  { port: 8082, name: 'Proxy' },
  { port: 10080, name: 'Proxy' },
  { port: 20000, name: 'DNP' },
  { port: 1, name: 'tcpmux' },
  { port: 7, name: 'echo' },
  { port: 9, name: 'discard' },
  { port: 13, name: 'daytime' },
  { port: 17, name: 'qotd' },
  { port: 19, name: 'chargen' },
  { port: 37, name: 'time' },
  { port: 42, name: 'nameserver' },
  { port: 43, name: 'nicname' },
  { port: 49, name: 'tacacs' },
  { port: 70, name: 'gopher' },
  { port: 79, name: 'finger' },
  { port: 88, name: 'kerberos' },
  { port: 101, name: 'hostname' },
  { port: 102, name: 'iso-tsap' },
  { port: 105, name: 'csnet-ns' },
  { port: 106, name: 'pop3pw' },
  { port: 109, name: 'pop2' },
  { port: 115, name: 'sftp' },
  { port: 118, name: 'sqlserv' },
  { port: 144, name: 'news' },
  { port: 156, name: 'sqlsvc' },
  { port: 161, name: 'snmp' },
  { port: 162, name: 'snmptrap' },
  { port: 177, name: 'xdmcp' },
  { port: 194, name: 'irc' },
  { port: 199, name: 'smux' },
  { port: 201, name: 'at-rtmp' },
  { port: 209, name: 'qmtp' },
  { port: 210, name: 'z39.50' },
  { port: 213, name: 'ipx' },
  { port: 220, name: 'imap3' },
  { port: 249, name: 'msp' },
  { port: 256, name: 'rap' },
  { port: 259, name: 'esro-gen' },
  { port: 264, name: 'bgmp' },
  { port: 311, name: 'mapp' }
];

const SERVICE_BANNER_PORTS = [21, 22, 25, 80, 110, 143, 443, 3306, 5432, 6379, 8080, 8443];

const portService = {
  async checkPort(host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ host, port, open: true, latency, service: this.getServiceName(port), error: null });
      });

      socket.on('error', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ host, port, open: false, latency, service: this.getServiceName(port), error: null });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ host, port, open: false, latency: timeout, service: this.getServiceName(port), error: 'Timeout' });
      });

      socket.connect(port, host);
    });
  },

  async grabBanner(host, port, timeout = 2000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      let banner = '';

      socket.on('connect', () => {
        if (port === 21 || port === 25 || port === 110 || port === 143 || port === 22) {
          socket.setEncoding('utf8');
        } else if (port === 80 || port === 443 || port === 8080 || port === 8443) {
          socket.write('HEAD / HTTP/1.0\r\nHost: ' + host + '\r\nConnection: close\r\n\r\n');
          socket.setEncoding('utf8');
        } else if (port === 3306 || port === 5432) {
          socket.setEncoding('utf8');
        } else {
          socket.setEncoding('utf8');
        }
      });

      socket.on('data', (data) => {
        banner += data.toString('utf8');
        if (banner.length > 2048) socket.destroy();
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });

      socket.on('close', () => {
        resolve(banner || null);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(banner || null);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(null);
      }
    });
  },

  async scanPorts(host, options = {}) {
    const config = store.getConfig();
    const timeout = options.timeout || 2000;
    const concurrency = options.concurrency || config.concurrency || 100;
    const scanService = options.service !== false;
    const progress = options.onProgress;

    let portList;
    if (options.top100) {
      portList = TOP100_PORTS.map(p => p.port);
    } else if (options.all) {
      portList = Array.from({ length: 65535 }, (_, i) => i + 1);
    } else if (options.fast) {
      portList = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 389, 443, 445, 993, 995, 1433, 1521, 2049, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017, 25565];
    } else if (options.ports) {
      portList = options.ports;
    } else {
      portList = COMMON_PORTS.map(p => p.port);
    }

    portList = [...new Set(portList)].sort((a, b) => a - b);
    const results = [];
    let completed = 0;
    const total = portList.length;

    for (let i = 0; i < portList.length; i += concurrency) {
      const chunk = portList.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (port) => {
          const result = await this.checkPort(host, port, timeout);
          if (scanService && result.open && SERVICE_BANNER_PORTS.includes(port)) {
            const banner = await this.grabBanner(host, port, 1500);
            if (banner) result.banner = banner.trim().split('\n')[0].trim();
          }
          return result;
        })
      );
      results.push(...chunkResults);
      completed += chunk.length;
      if (progress) progress(completed, total);
    }

    const open = results.filter(r => r.open);
    const closed = results.filter(r => !r.open);

    return {
      host,
      total,
      openCount: open.length,
      closedCount: closed.length,
      startTime: null,
      endTime: null,
      open,
      closed,
      all: results
    };
  },

  async scanCommonPorts(host) {
    return this.scanPorts(host, { top100: false, service: true });
  },

  getServiceName(port) {
    const all = [...COMMON_PORTS, ...TOP100_PORTS];
    const found = all.find(p => p.port === port);
    return found ? found.name : 'Unknown';
  },

  detectServiceFromBanner(port, banner) {
    if (!banner) return this.getServiceName(port);
    const b = banner.toLowerCase();
    if (b.includes('apache')) return 'Apache';
    if (b.includes('nginx')) return 'NGINX';
    if (b.includes('node.js') || b.includes('node')) return 'Node.js';
    if (b.includes('iis')) return 'IIS';
    if (b.includes('mysql')) return 'MySQL';
    if (b.includes('postgres')) return 'PostgreSQL';
    if (b.includes('redis')) return 'Redis';
    if (b.includes('mongodb')) return 'MongoDB';
    if (b.includes('ssh') || b.includes('openssh')) return 'SSH';
    if (b.includes('ftp') || b.includes('vsftpd')) return 'FTP';
    if (b.includes('smtp') || b.includes('exim') || b.includes('postfix') || b.includes('sendmail')) return 'SMTP';
    if (b.includes('rdp') || b.includes('terminal')) return 'RDP';
    if (b.includes('minecraft')) return 'Minecraft';
    if (b.includes('http') || b.includes('server:')) {
      const serverMatch = banner.match(/Server:\s*([^\r\n]+)/i);
      if (serverMatch) return serverMatch[1].trim();
      return 'HTTP';
    }
    return this.getServiceName(port);
  }
};

module.exports = portService;
