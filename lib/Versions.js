const json = require('../lib/Json.js').default;
const logger = require('../lib/logger.js').default;
const semver = require('./semver.js').default;

const debugArray = array => array.reduce((result, element, index) => result.push(index % 10 === 9 ? `\n${element}` : element) && result, []).join(', ');

class Versions {

  constructor() {
    this.cache = {};
  }

  async all(name) {
    if (this.cache[name]) {
      return this.cache[name];
    }
    return json.getVersions(name).then(({value}) => {
      logger.verbose(['Found %d available versions for %s.', value.length, name]);
      logger.debug(debugArray(value));
      return this.cache[name] = value;
    });
  }

  async matching(name, range = '>=3.0.0') {
    return this.all(name).then(({value}) => {
      const matched = semver.filter(value, range).reverse();
      logger.verbose(['Matched %d out of %d versions for %s.', matched.length, value.length, name]);
      logger.debug(debugArray(matched));
      return matched;
    });
  }

  async missing(name = 'bootstrap', existing = [], range = '>=3.0.0') {
    return this.matching(name, range).then(({value}) => {
      const missing = value.filter(version => existing.indexOf(version) === -1);
      logger.verbose(['Found %d missing versions for %s.', missing.length, name]);
      logger.debug(debugArray(missing));
      return missing;
    });
  }

}

module.exports = logger.createMultipleTasks(new Versions());
module.exports.default = module.exports;
