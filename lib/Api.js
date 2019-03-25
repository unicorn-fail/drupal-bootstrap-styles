const path = require('path');

const argv = require('./argv.js');
const fs = require('./fs.js').default;
const logger = require('./logger.js').default;
const { absolute, relative } = require('./Paths').default;
const sri = require('./Sri.js').global;

class Api {

  constructor() {
    this.file = relative.dist('api.json');
    this.changed = false;
    this.json = { time: null, files: [] };
  }

  async getFiles() {
    return fs.list(relative.dist(), { directories: false, recurse: true });
  }

  async parse(files) {
    const exists = (await fs.pathExists(this.file)).value;
    if (exists) {
      try {
        this.json = fs.readJsonSync(this.file)
      }
      catch (e) {
        // Intentionally left empty.
      }
    }
    this.json.time = new Date().toISOString();
    return Promise.mapSeries(files, async file => {
      const index = this.json.files.findIndex(f => f.name === `/${file}`);
      let data = index !== -1 ? this.json.files[index] : {};

      // Only process the contents of the file if forced, doesn't exist and
      // not the api.json file itself.
      if ((argv.force || index === -1) && file !== this.file) {
        const stat = fs.statSync(file);
        const lstat = fs.lstatSync(file);
        const symlink = lstat.isSymbolicLink() ? path.relative(absolute.root, fs.realpathSync(file)) : false;
        const symlinkIndex = symlink ? this.json.files.findIndex(f => f.name === `/${symlink}`) : -1;
        if (symlinkIndex !== -1) {
          data = {...this.json.files[symlinkIndex]};
          data.name = `/${file}`;
          data.symlink = `/${symlink}`;
        }
        else {
          const content = (await fs.readFile(file)).value.toString('utf-8');
          data = {
            name: `/${file}`,
            size: stat.size,
            sha512: (await sri.generateHash(content)).value,
            time: stat.mtime.toISOString(),
          };
        }
        if (index === -1) {
          this.json.files.push(data);
        }
        else {
          this.json.files.splice(index, 1, data);
        }
        this.changed = true;
      }
    });
  }

  async update() {
    return this.getFiles()
      .then(({ value: files }) => this.parse(files))
      .then(() => this.changed && this.write());
  }

  async write() {
    return fs.outputJson(this.file, this.json, { spaces: 2 });
  }

}

module.exports = logger.createMultipleTasks(new Api());
module.exports.default = module.exports;
