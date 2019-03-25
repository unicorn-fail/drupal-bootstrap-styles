const gitTag = require('git-tag');

const logger = require('./logger.js');

class GitTags {

  constructor() {
    this.gitTag = gitTag({
      localOnly: true,
    });
  }

  async all() {
    return new Promise(resolve => this.gitTag.all(resolve));
  }

  async latest() {
    return new Promise(resolve => {
      this.gitTag.latest(latest => {
        if (!latest) {
          latest = '3.0.0';
        }
        logger.info(['Latest tagged release: %s', latest]);
        resolve(latest);
      })
    });
  }

}

module.exports = logger.createMultipleTasks(new GitTags());
module.exports.default = module.exports;
