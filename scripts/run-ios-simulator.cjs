#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, ".expo", "ios-simulator");

function parseArgs(args) {
  const options = {
    configuration: "Debug",
    port: "8081",
    build: true,
    bundler: true,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (["--device", "-d", "--configuration", "--port"].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`${arg} requires a value.`);
      options[arg === "-d" ? "device" : arg.slice(2)] = value;
    } else if (arg === "--no-build") options.build = false;
    else if (arg === "--no-bundler") options.bundler = false;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else
      throw new Error(
        `Unknown option ${arg}. Use --help for simulator options.`,
      );
  }
  if (!options.bundler && options.port !== "8081")
    throw new Error(
      "--port cannot be combined with --no-bundler. Reuse Metro on port 8081 or let the launcher start Metro.",
    );
  if (!["Debug", "Release"].includes(options.configuration))
    throw new Error("--configuration must be Debug or Release.");
  if (
    !/^\d+$/.test(options.port) ||
    Number(options.port) < 1 ||
    Number(options.port) > 65535
  )
    throw new Error("--port must be between 1 and 65535.");
  return options;
}

/** Only simctl's available iOS destinations can ever enter this launch path. */
function selectSimulator(inventory, search) {
  const devices = Object.entries(inventory.devices ?? {})
    .filter(([runtime]) => runtime.includes(".SimRuntime.iOS-"))
    .flatMap(([, rows]) =>
      rows.filter((device) => device.isAvailable === true),
    );
  const needle = search?.toLowerCase();
  if (needle && needle !== "simulator") {
    const matches = devices.filter(
      (device) =>
        device.udid.toLowerCase() === needle ||
        device.name.toLowerCase() === needle,
    );
    const selected =
      matches.find((device) => device.state === "Booted") ?? matches[0];
    if (!selected)
      throw new Error(
        `No available iOS simulator named "${search}". Use Device Hub to create one, or use npm run ios:device for a physical phone.`,
      );
    return selected;
  }
  const selected =
    devices.find((device) => device.state === "Booted") ?? devices[0];
  if (!selected)
    throw new Error(
      "No available iOS simulators. Create an iOS device in Device Hub first.",
    );
  return selected;
}

function buildArgs(options, directory) {
  return [
    "run:ios",
    "--device",
    "generic",
    "--configuration",
    options.configuration,
    "--no-bundler",
    "--output",
    directory,
  ];
}

function launchArgs(options, device, binary) {
  return [
    "run:ios",
    "--device",
    device.udid,
    "--configuration",
    options.configuration,
    "--binary",
    binary,
    ...(options.bundler ? ["--port", options.port] : ["--no-bundler"]),
  ];
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} failed${result.signal ? ` (${result.signal})` : ` (exit ${result.status})`}.${capture ? `\n${result.stderr}` : ""}`,
    );
  return result.stdout;
}

function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(
      "npm run ios -- [--device <name|UDID>] [--no-build] [--no-bundler] [--configuration Debug|Release] [--port 8081]\n\nBuilds a simulator binary, then installs and opens it in Device Hub.\nUse --no-build only when native dependencies/configuration have not changed.\nPhysical iPhone: npm run ios:device",
    );
    return;
  }
  if (process.platform !== "darwin")
    throw new Error("Local iOS simulator builds require macOS and Xcode.");
  const device = selectSimulator(
    JSON.parse(
      run("xcrun", ["simctl", "list", "devices", "available", "--json"], true),
    ),
    options.device,
  );
  console.log(`\nUsing iOS simulator: ${device.name} (${device.udid})`);
  // Keep Debug/Release outputs separate so --no-build never picks the wrong configuration.
  const directory = path.join(outputDir, options.configuration);
  const expoBin = require.resolve("expo/bin/cli");
  if (options.build) {
    console.log(
      "Building for the simulator without developer-certificate provisioning…",
    );
    // Expo's generic simulator build skips its Apple-sign-in certificate preflight.
    // Xcode still applies the normal simulator ad-hoc signature and entitlements.
    run(process.execPath, [expoBin, ...buildArgs(options, directory)]);
  }
  const apps = fs.existsSync(directory)
    ? fs.readdirSync(directory).filter((name) => name.endsWith(".app"))
    : [];
  if (apps.length !== 1)
    throw new Error(
      "No unique simulator app build found. Run npm run ios without --no-build first.",
    );
  run(process.execPath, [
    expoBin,
    ...launchArgs(options, device, path.join(directory, apps[0])),
  ]);
}

module.exports = { parseArgs, selectSimulator, buildArgs, launchArgs };
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  }
}
