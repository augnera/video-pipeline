// Restrict this experiment's Remotion servers; do not change installed packages.
// Remotion 4.0.539 otherwise binds Studio to :: / 0.0.0.0.
const ports = require('../node_modules/@remotion/renderer/dist/port-config.js');
ports.getPortConfig = () => ({host: '127.0.0.1', hostsToTry: ['127.0.0.1']});
