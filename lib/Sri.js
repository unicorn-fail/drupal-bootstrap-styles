const getSRI = require('get-sri');

const logger = require('./logger.js').default;

class Sri {

  constructor() {
    this.hashes = new Map();
    this.duplicates = new Map();
    this.seen = new Map();
  }

  async generateHash(data) {
    if (this.hashes.has(data)) {
      return this.hashes.get(data);
    }
    const hash = getSRI(data, 'sha512');
    this.hashes.set(data, hash);
    return hash;
  }

  async getTarget(data, target) {
    return this.generateHash(data)
      .then(({value:hash}) => this.hashExists(hash, target));
  }

  async hashExists(hash, target) {
    if (!hash) {
      return null;
    }

    if (this.seen.has(hash)) {
      if (!this.duplicates.has(hash)) {
        this.duplicates.set(hash, new Set());
      }
      this.duplicates.get(hash).add(target);
      return this.seen.get(hash);
    }

    this.seen.set(hash, target);
    return null;
  }

  get seenCount() {
    return this.seen.size;
  }

  get duplicateCount() {
    return [...this.duplicates.values()].map(v => [...v]).flat().length;
  }

}

module.exports = Sri;
module.exports.global = logger.createMultipleTasks(new Sri(), { level: 'info' });
global.sri = module.exports.global;
module.exports.default = module.exports;
