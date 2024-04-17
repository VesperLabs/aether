// Monkeypatches the `require` function to strip out
// things that are broken in node_modules that we cannot change.
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function () {
  const module = originalRequire.apply(this, arguments);
  // phaser-on-nodejs/src/index.ts
  // This errors in node v21 if we don't do this:
  if (arguments[0].includes("filename_or_condition_to_modify")) {
    const modifiedCode = module
      .toString()
      .replace(/global\.navigator\s*=\s*\{ userAgent: 'node' \}/g, "");
    return eval(modifiedCode);
  }
  return module;
};
