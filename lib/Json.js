const simpleJsonRequest = require('simple-json-request');

const logger = require('./logger.js');

const apiUrl = 'https://data.jsdelivr.com/v1/package/npm';

class Json {

  get(url, options = {}) {
    options = {
      ...options,
      url: url,
    };
    return simpleJsonRequest.get(options).catch(function (err) {
      logger.error(`Unable to request JSON from: ${url}`);
      logger.error(err);
      return [];
    });
  }

  async getVersions(name) {
    return this.get(`${apiUrl}/${name}`).then(({value}) => value.versions);
  }

}

module.exports = logger.createMultipleTasks(new Json(), { level: 'verbose' });
module.exports.default = module.exports;
