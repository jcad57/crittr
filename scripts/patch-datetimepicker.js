/**
 * Under New Architecture interop, @react-native-community/datetimepicker may use the
 * Paper UIView (RNDateTimePicker) instead of RNDateTimePickerComponentView. The package
 * gates addTarget behind `#ifndef RCT_NEW_ARCH_ENABLED`, so onChange never fires and
 * time/date wheels appear stuck on the initial value (often 8:00 AM for feed times).
 *
 * See: https://github.com/react-native-datetimepicker/datetimepicker/issues/995
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-community",
  "datetimepicker",
  "ios",
  "RNDateTimePicker.m",
);

const MARKER = "Crittr: always register UIDatePicker target actions";

if (!fs.existsSync(filePath)) {
  console.warn(
    "[patch-datetimepicker] RNDateTimePicker.m not found — skipping",
  );
  process.exit(0);
}

const contents = fs.readFileSync(filePath, "utf8");

if (contents.includes(MARKER)) {
  console.log("[patch-datetimepicker] already applied");
  process.exit(0);
}

const patched = contents.replace(
  /#ifndef RCT_NEW_ARCH_ENABLED\s*\n\s*\/\/ somehow, with Fabric, the callbacks are executed here as well as in RNDateTimePickerComponentView\s*\n\s*\/\/ so do not register it with Fabric, to avoid potential problems\s*\n\s*\[self addTarget:self action:@selector\(didChange\)\s*\n\s*forControlEvents:UIControlEventValueChanged\];\s*\n\s*\[self addTarget:self action:@selector\(onDismiss:\) forControlEvents:UIControlEventEditingDidEnd\];\s*\n\s*#endif/,
  `// ${MARKER}
    // New Arch interop can use this Paper view without Fabric ComponentView wiring.
    [self addTarget:self action:@selector(didChange)
             forControlEvents:UIControlEventValueChanged];
    [self addTarget:self action:@selector(onDismiss:) forControlEvents:UIControlEventEditingDidEnd];`,
);

if (patched === contents) {
  console.warn(
    "[patch-datetimepicker] expected #ifndef RCT_NEW_ARCH_ENABLED block not found — skipping",
  );
  process.exit(0);
}

fs.writeFileSync(filePath, patched);
console.log("[patch-datetimepicker] applied New Architecture onChange fix");
