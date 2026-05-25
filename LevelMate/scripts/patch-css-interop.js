/**
 * Patches react-native-css-interop to use the Metro event format expected by
 * Expo SDK 55 / Metro 0.81+. The package emits `eventsQueue` but Metro now
 * expects `{ changes: { addedFiles, modifiedFiles, removedFiles }, rootDir }`.
 *
 * Remove this script once react-native-css-interop > 0.2.4 ships the fix.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-native-css-interop', 'dist', 'metro', 'index.js');

if (!fs.existsSync(file)) {
  console.log('[patch-css-interop] File not found, skipping.');
  process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');

const OLD = `haste.emit("change", {
                eventsQueue: [
                    {
                        filePath,
                        metadata: {
                            modifiedTime: Date.now(),
                            size: 1,
                            type: "virtual",
                        },
                        type: "change",
                    },
                ],
            });`;

const NEW = `haste.emit("change", {
                changes: {
                    addedFiles: [],
                    modifiedFiles: [[filePath, { modifiedTime: Date.now(), size: 1, type: "virtual" }]],
                    removedFiles: [],
                },
                rootDir: "",
            });`;

if (src.includes(OLD)) {
  fs.writeFileSync(file, src.replace(OLD, NEW), 'utf8');
  console.log('[patch-css-interop] Patched successfully.');
} else if (src.includes(NEW)) {
  console.log('[patch-css-interop] Already patched, skipping.');
} else {
  console.warn('[patch-css-interop] Pattern not found — patch may be outdated.');
}
