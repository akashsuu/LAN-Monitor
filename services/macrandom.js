const vendor = require('./vendor');

const PRIVATE_MAC_PREFIXES = [
  '02', '06', '0A', '0E', '12', '16', '1A', '1E',
  '22', '26', '2A', '2E', '32', '36', '3A', '3E',
  '42', '46', '4A', '4E', '52', '56', '5A', '5E',
  '62', '66', '6A', '6E', '72', '76', '7A', '7E',
  '82', '86', '8A', '8E', '92', '96', '9A', '9E',
  'A2', 'A6', 'AA', 'AE', 'B2', 'B6', 'BA', 'BE',
  'C2', 'C6', 'CA', 'CE', 'D2', 'D6', 'DA', 'DE',
  'E2', 'E6', 'EA', 'EE', 'F2', 'F6', 'FA', 'FE'
];

function isPrivateMAC(mac) {
  if (!mac || mac === 'N/A') return false;
  const clean = mac.replace(/[:\-]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const firstByte = clean.substring(0, 2);
  const byteVal = parseInt(firstByte, 16);
  return (byteVal & 0x02) === 0x02;
}

function isRandomizedMAC(mac) {
  if (!mac || mac === 'N/A') return false;
  const clean = mac.replace(/[:\-]/g, '').toUpperCase();
  if (clean.length < 8) return false;
  const prefix = clean.substring(0, 6);
  const ouiVendor = vendor.lookupVendor(mac);
  if (ouiVendor !== 'Unknown') return false;
  const firstByte = parseInt(clean.substring(0, 2), 16);
  const secondByte = parseInt(clean.substring(2, 4), 16);
  if ((firstByte & 0x02) === 0x02) return true;
  if (clean.startsWith('DA') || clean.startsWith('EA') || clean.startsWith('FA')) return true;
  if (secondByte < 0x10 && (firstByte & 0x02) === 0x02) return true;
  return false;
}

function detectMACType(mac) {
  if (!mac || mac === 'N/A') {
    return { type: 'Unknown', reason: 'No MAC address available', isPrivate: false, isRandomized: false };
  }

  const clean = mac.replace(/[:\-]/g, '').toUpperCase();
  const ouiVendor = vendor.lookupVendor(mac);
  const firstByte = parseInt(clean.substring(0, 2), 16);
  const isPrivate = (firstByte & 0x02) === 0x02;
  const isBroadcast = clean === 'FFFFFFFFFFFF';
  const isMulticast = (firstByte & 0x01) === 0x01;

  if (isBroadcast) {
    return { type: 'Broadcast', reason: 'Broadcast MAC address (FF:FF:FF:FF:FF:FF)', isPrivate: false, isRandomized: false };
  }

  if (isMulticast && !isPrivate) {
    return { type: 'Multicast', reason: 'Multicast MAC address (bit 0 set)', isPrivate: false, isRandomized: false };
  }

  if (ouiVendor !== 'Unknown') {
    if (isPrivate) {
      return { type: 'Possibly Randomized', reason: `Second bit is set (private), but OUI matches ${ouiVendor}`, isPrivate: true, isRandomized: false };
    }
    return { type: 'Permanent', reason: `Registered OUI: ${ouiVendor}`, isPrivate: false, isRandomized: false };
  }

  if (isPrivate) {
    if (clean.startsWith('DA') || clean.startsWith('EA') || clean.startsWith('FA')) {
      return { type: 'Randomized (Mobile OS)', reason: `Second bit set (private) + no OUI match + prefix ${clean.substring(0,2)}:${clean.substring(2,4)} is commonly used by mobile OS random assignment`, isPrivate: true, isRandomized: true };
    }
    const secondByte = parseInt(clean.substring(2, 4), 16);
    if (secondByte < 0x20) {
      return { type: 'Randomized (Apple)', reason: `Private bit set, no OUI match, low second byte (${clean.substring(2,4)}) - matches Apple randomization pattern`, isPrivate: true, isRandomized: true };
    }
    if (secondByte >= 0x80) {
      return { type: 'Randomized (Android)', reason: `Private bit set, no OUI match, high second byte (${clean.substring(2,4)}) - matches Android randomization pattern`, isPrivate: true, isRandomized: true };
    }
    return { type: 'Randomized (Private)', reason: `Private bit set, no registered OUI match`, isPrivate: true, isRandomized: true };
  }

  if (clean.startsWith('00') || clean.startsWith('FF')) {
    return { type: 'Permanent', reason: 'Standard prefix, likely permanent MAC', isPrivate: false, isRandomized: false };
  }

  return { type: 'Unknown', reason: 'Could not classify this MAC address', isPrivate: false, isRandomized: false };
}

module.exports = { isPrivateMAC, isRandomizedMAC, detectMACType };
