module.exports = function isDev() {
  return eApp.getPath("exe").includes("/node_modules/electron-prebuilt/");
}
