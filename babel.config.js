module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Must stay last.
      "react-native-reanimated/plugin",
    ],
    env: {
      production: {
        plugins: [
          // The app carries ~200 console statements, many of them logging user
          // ids, emails, tokens-adjacent auth state and full cloud-sync
          // payloads. Console calls are not free in a release bundle and the
          // output is readable from a connected device, so strip everything
          // except error/warn from store builds.
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
