const semver = require('semver');
const defaultOptions = {
  includePrerelease: false,
};

semver.filter = (versions, range, options = {}) => {
  options = {
    ...defaultOptions,
    maxOperator: '<=',
    minOperator: '>=',
    ...options,
  };
  // Range is a min/max based on the array versions supplied.
  if (Array.isArray(range)) {
    const min = semver.minSatisfying(range, '*');
    const max = semver.maxSatisfying(range, '*');
    range = `${options.minOperator}${min} ${options.maxOperator}${max}`;
  }
  return versions.filter(version => semver.valid(version, options) && semver.satisfies(version, range, options));
};

module.exports = semver;
module.exports.default = module.exports;
