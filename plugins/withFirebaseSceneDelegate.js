const { withDangerousMod, IOSConfig } = require("expo/config-plugins");
const fs = require("node:fs");

/** RN Firebase 26's plugin expects the pre-SDK58 startReactNative call. */
module.exports = (config) =>
  withDangerousMod(config, [
    "ios",
    async (mod) => {
      const delegate = IOSConfig.Paths.getAppDelegate(
        mod.modRequest.projectRoot,
      );
      if (delegate.language !== "swift")
        throw new Error("Firebase scene setup requires the Swift AppDelegate");
      let source = fs.readFileSync(delegate.path, "utf8");
      if (!source.includes("FirebaseApp.configure()")) {
        const anchor = "    let delegate = ReactNativeDelegate()";
        if (!source.includes(anchor))
          throw new Error(
            "Could not locate Firebase launch initialization point",
          );
        if (!source.includes("import FirebaseCore"))
          source = source.replace(
            "import React\n",
            "import FirebaseCore\nimport React\n",
          );
        source = source.replace(
          anchor,
          "    if FirebaseApp.app() == nil { FirebaseApp.configure() }\n" +
            anchor,
        );
        fs.writeFileSync(delegate.path, source);
      }
      return mod;
    },
  ]);
