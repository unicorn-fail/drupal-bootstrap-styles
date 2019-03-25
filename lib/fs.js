const path = require('path');

// Promisify all filesystem methods.
// Log to the "insane" level though as it can be quite frequent.
const fs = require('fs-extra');

const logger = require('./logger.js');

fs.list = async function (dir, options = {}) {
  options = {
    absolute: true,
    create: false,
    directories: true,
    files: true,
    symbolicLink: true,
    permissions: null,
    recurse: false,
    reject: false,
    ...options
  };

  // Determine needed permissions automatically.
  if (options.permissions === null) {
    options.permissions = options.create ? this.R_OK | this.W_OK : this.R_OK;
  }

  // Check access.
  return this
    .access(dir, options.permissions)
    .then(({ value: access }) => !access && options.create && this.mkdir(dir, options).then(() => this.access(dir, options).then(({ value: access }) => !access && Promise[options.reject ? 'reject' : 'resolve']([]))))
    .then(() => this.readdir(dir))
    .then(({ value: files }) => Promise.reduce(files, async (results, file) => {
      const absolutePath = path.join(dir, file);
      return this.stat(absolutePath)
        .then(({value:stat}) => {
          if ((options.directories && stat.isDirectory())
            || (options.files && stat.isFile())
            || (options.symbolicLink && stat.isSymbolicLink())
          ) {
            results = [...results, options.absolute ? absolutePath : file];
          }
          if (options.recurse && stat.isDirectory()) {
            return this.list(absolutePath, options).then(({value:sub}) => results = [...results, ...sub]);
          }
          return results;
        });
    }, []));
};

module.exports = logger.createMultipleTasks(fs, {
  errorsAsFalse: true,
  quiet: ['stat'],
  level: 'insane',
  name: 'fs',
});
module.exports.default = module.exports;

