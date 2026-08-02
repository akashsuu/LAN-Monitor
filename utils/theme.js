const realChalk = require('chalk');

// Accent color remap: map cyan / blue (and their bright variants) to light pink.
const PINK = '\u001b[38;2;244;143;177m';
const REMAP = [
	['\u001b[36m', PINK], // cyan
	['\u001b[96m', PINK], // bright cyan
	['\u001b[34m', PINK], // blue
	['\u001b[94m', PINK], // bright blue
	['\u001b[35m', PINK], // magenta
	['\u001b[95m', PINK] // bright magenta
];

function postProcess(str) {
	let out = String(str);
	for (const [from, to] of REMAP) {
		if (out.indexOf(from) !== -1) {
			out = out.split(from).join(to);
		}
	}
	return out;
}

function themed(builder) {
	const fn = (...args) => postProcess(builder(...args));
	return new Proxy(fn, {
		get(target, prop) {
			return typeof builder[prop] === 'function' ? themed(builder[prop]) : builder[prop];
		}
	});
}

module.exports = themed(realChalk);
module.exports.theme = {
	name: 'light-pink',
	accent: '#f48fb1'
};