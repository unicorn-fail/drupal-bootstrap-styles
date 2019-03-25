#!/usr/bin/env node
global.Promise = require('bluebird');
global.Promise.config({})

const path = require('path');

const argv = require('./lib/argv.js');
const fs = require('./lib/fs.js').default;
const logger = require('./lib/logger.js').default;
const api = require('./lib/Api.js').default;
const Bootstrap = require('./lib/Bootstrap.js').default;
const { absolute } = require('./lib/Paths').default;
const versions = require('./lib/Versions.js').default;

(async () => {
  return Promise.resolve()
    .then(() => argv.removeDist && fs.remove(absolute.dist()))
    .then(() => fs.ensureDir(absolute.dist()))
    .then(() => fs.list(absolute.src(), { files: false }))
    .then(({ value: ranges }) => [...ranges].map(d => d.split(path.sep).pop()))
    .mapSeries(range => versions.matching('bootstrap', range)
      .then(({ value: versions }) => versions)
      .mapSeries(version => {
        logger.header(['bootstrap@%s', version]);
        const asset = logger.createMultipleTasks(new Bootstrap(version));
        return asset.variablesExist()
          .then(() => fs.list(absolute.src(range), { files: false }))
          .then(({ value: branches }) => [...branches].map(d => d.split(path.sep).pop()))
          .mapSeries(branch => asset.compile(branch))
      })
    )
    .then(() => {
      logger.header('API JSON');
      return api.update();
    });

})();
