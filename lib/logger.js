const argv = require('./argv.js');
const Logger = require('./Logger/Logger.js');

// Construct a new logger instance and pass argv to set the current level.
const logger = new Logger({ argv });

// // Tests.
// logger.line(['Testing %s placeholder', 'sprintf']);
// logger.insane(['Testing %s placeholder', 'sprintf']);
// logger.debug(['Testing %s placeholder', 'sprintf']);
// logger.info(['Testing %s placeholder', 'sprintf']);
// logger.verbose(['Testing %s placeholder', 'sprintf']);
// logger.warn(['Testing %s placeholder', 'sprintf']);
// logger.error(['Testing %s placeholder', 'sprintf']);
// logger.fatal(['Testing %s placeholder', 'sprintf']);

module.exports = logger;
module.exports.symbols = Logger.symbols;
module.exports.default = module.exports;
