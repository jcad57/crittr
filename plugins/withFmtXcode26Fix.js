/**
 * Xcode 26.4+ (Apple Clang 21) rejects fmt 11.0.2's FMT_STRING consteval
 * when React Native is compiled from source (`ios.buildReactNativeFromSource`,
 * required here for Firebase static frameworks).
 *
 * Injects a CocoaPods post_install workaround so clean prebuilds keep building.
 * See: https://github.com/expo/expo/issues/44229
 */
const { withPodfile } = require("expo/config-plugins");

const MARKER = "Crittr: Xcode 26 fmt consteval workaround";

const POST_INSTALL_SNIPPET = `
    # ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('Xcode 26 workaround')
        patched = content.gsub(
          /#elif defined\\(__cpp_consteval\\)\\n#\\s*define FMT_USE_CONSTEVAL 1/,
          "#elif defined(__cpp_consteval)\\n// Xcode 26 workaround: disable consteval\\n#  define FMT_USE_CONSTEVAL 0"
        )
        if patched != content
          File.chmod(0644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end
`;

function withFmtXcode26Fix(config) {
  return withPodfile(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) {
      return cfg;
    }

    const replaced = cfg.modResults.contents.replace(
      /(:ccache_enabled => ccache_enabled\?\(podfile_properties\),?\s*\n\s*\))/,
      (match) => `${match}\n${POST_INSTALL_SNIPPET}`,
    );

    if (replaced === cfg.modResults.contents) {
      throw new Error(
        "[withFmtXcode26Fix] Could not find react_native_post_install in the Podfile to inject the fmt workaround.",
      );
    }

    cfg.modResults.contents = replaced;
    return cfg;
  });
}

module.exports = withFmtXcode26Fix;
