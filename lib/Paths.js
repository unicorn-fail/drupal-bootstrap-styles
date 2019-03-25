const path = require('path');

const fs = require('./fs');
const logger = require('./logger.js').default;

class Paths {

  constructor(options = {}) {
    options = {
      root: path.resolve(__dirname, '..'),
      relative: false,
      ...options
    };
    this.root = options.root;
    this.relative = options.relative;
  }

  join(...paths) {
    const file = path.join(this.root, ...paths);
    return this.relative ? path.relative(this.root, file) : file;
  }

  assets(...paths) {
    return this.join('assets', ...paths);
  }

  assetMixins(precompiler, version, name) {
    const dir = precompiler === 'sass' ? 'scss' : 'less';
    const partial = precompiler === 'sass' ? '_' : '';
    return this.assets(version, name, dir, `${partial}mixins.${dir}`);
  }

  assetVariables(precompiler, version, name, theme) {
    const dir = precompiler === 'sass' ? 'scss' : 'less';
    const extension = precompiler === 'sass' ? 'scss' : 'less';
    const partial = precompiler === 'sass' ? '_' : '';
    if (theme === 'bootstrap') {
      theme = false;
    }
    else if (!theme && name === 'bootswatch') {
      theme = 'cerulean';
    }
    return this.assets(version, name, theme || dir, `${partial}variables.${extension}`);
  }

  dist(...paths) {
    return this.join('dist', ...paths);
  }

  src(...paths) {
    return this.join('src', ...paths);
  }

  cssOutput(version, branch, theme, minified = false) {
    const min = minified ? '.min' : '';
    return this.dist(version, branch, theme && theme !== 'bootstrap' ? `drupal-bootstrap-${theme}${min}.css` : `drupal-bootstrap${min}.css`);
  }

  srcDrupalBootstrap(precompiler, version, branch) {
    return this.srcFile(precompiler, version, branch, 'drupal-bootstrap');
  }

  srcFile(precompiler, version, branch, ...paths) {
    const extension = precompiler === 'sass' ? 'scss' : 'less';
    const partial = precompiler === 'sass' ? '_' : '';
    const file = paths.pop();
    return this.src(`${version[0]}.x.x`, branch, precompiler, ...paths, `${partial}${file}.${extension}`);
  }

  srcDefaultVariables(precompiler, version, branch) {
    const file = precompiler === 'sass' ? 'default-variables' : 'variable-overrides';
    return this.srcFile(precompiler, version, branch, file);
  }

  srcMissingVariables(precompiler, version) {
    const extension = precompiler === 'sass' ? 'scss' : 'less';
    const partial = precompiler === 'sass' ? '_' : '';
    const file = 'missing-variables';
    return this.src(`${version[0]}.x.x`, `${partial}${file}.${extension}`);
  }

  // Helper function for falling back to a Bootstrap variables file.
  resolveVariables(precompiler, version, name, theme, backup) {
    if (backup === true) {
      logger.insane('Checking for backup variables file...');
    }
    if (!fs.exists(path.join(librariesPath, file))) {
      logger.verbose(['Missing %s', file]);
      file = false;
      if (backup && backup !== true) {
        file = this.resolveVariables(backup, true);
        if (file) {
          logger.insane("Using: " + file);
        }
      }
      return file;
    }
    else if (backup === true) {
      grunt.verbose.ok();
    }
    return file;
  };

}

module.exports = Paths;
module.exports.absolute = new Paths();
module.exports.relative = new Paths({ relative: true });
module.exports.default = module.exports;
