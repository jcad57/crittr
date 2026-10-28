const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseArgs,
  selectSimulator,
  buildArgs,
  launchArgs,
} = require("../scripts/run-ios-simulator.cjs");
const first = {
  udid: "sim-a",
  name: "iPhone 17 Pro",
  state: "Booted",
  isAvailable: true,
};
const second = {
  udid: "sim-b",
  name: "iPhone 17",
  state: "Booted",
  isAvailable: true,
};
const inventory = {
  devices: {
    "com.apple.CoreSimulator.SimRuntime.iOS-27-0": [
      first,
      second,
      { ...first, udid: "unavailable", isAvailable: false },
    ],
    "com.apple.CoreSimulator.SimRuntime.tvOS-27-0": [
      { ...first, udid: "tv", name: "Apple TV" },
    ],
  },
};
test("simulator launch selects an available booted iOS device", () => {
  assert.equal(selectSimulator(inventory).udid, "sim-a");
  assert.equal(selectSimulator(inventory, "simulator").udid, "sim-a");
  assert.equal(selectSimulator(inventory, "IPHONE 17").udid, "sim-b");
  assert.equal(selectSimulator(inventory, "sim-b").udid, "sim-b");
});
test("simulator launch rejects unavailable, other-platform and physical destinations", () => {
  for (const target of ["unavailable", "tv", "physical-iphone"])
    assert.throws(
      () => selectSimulator(inventory, target),
      /No available iOS simulator/,
    );
  assert.throws(() => selectSimulator({ devices: {} }), /Create an iOS device/);
});
test("build uses Expo's generic simulator path and install uses the selected UUID and binary", () => {
  const options = parseArgs(["--device", "iPhone 17", "--port", "8082"]);
  const build = buildArgs(options, "/output");
  assert.equal(build[build.indexOf("--device") + 1], "generic");
  assert.ok(build.includes("--no-bundler"));
  assert.ok(!build.includes("--port"));
  const launch = launchArgs(options, second, "/output/Crittr.app");
  assert.equal(launch[launch.indexOf("--device") + 1], "sim-b");
  assert.equal(launch[launch.indexOf("--binary") + 1], "/output/Crittr.app");
  assert.equal(launch[launch.indexOf("--port") + 1], "8082");
  const existingMetro = launchArgs(
    parseArgs(["--no-bundler"]),
    second,
    "/output/Crittr.app",
  );
  assert.ok(existingMetro.includes("--no-bundler"));
  assert.ok(!existingMetro.includes("--port"));
});
test("launch options reject typos and require explicit values", () => {
  assert.throws(() => parseArgs(["--device"]), /requires a value/);
  assert.throws(() => parseArgs(["--devcie", "sim-a"]), /Unknown option/);
  assert.equal(parseArgs(["--no-build"]).build, false);
  assert.throws(
    () => parseArgs(["--port", "8082", "--no-bundler"]),
    /cannot be combined/,
  );
  assert.throws(() => parseArgs(["--port", "bad"]), /between 1 and 65535/);
  assert.throws(
    () => parseArgs(["--configuration", "Invalid"]),
    /Debug or Release/,
  );
});
