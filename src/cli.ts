#!/usr/bin/env node
/**
 * This file contains the CLI entry point of Matterbridge.
 *
 * @file cli.ts
 * @author Luca Liguori
 * @date 2023-12-29
 * @version 1.0.11
 *
 * Copyright 2023, 2024, 2025 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */

/* eslint-disable no-console */
// import wtf from 'wtfnode';
import { Matterbridge } from './matterbridge.js';

let instance: Matterbridge | undefined;
const cli = '\u001B[32m';
const er = '\u001B[38;5;9m';
const rs = '\u001B[40;0m';

async function main() {
  if (process.argv.includes('-debug')) console.log(cli + 'CLI: Matterbridge.loadInstance() called' + rs);
  instance = await Matterbridge.loadInstance(true);
  registerHandlers();
  if (process.argv.includes('-debug')) console.log(cli + 'CLI: Matterbridge.loadInstance() exited' + rs);
}

function registerHandlers() {
  if (instance) instance.on('shutdown', async () => shutdown());
  if (instance) instance.on('restart', async () => restart());
  if (instance) instance.on('update', async () => update());
}

async function shutdown() {
  if (process.argv.includes('-debug')) console.log(cli + 'CLI: received shutdown event, exiting...' + rs);
  // wtf.dump();
  process.exit(0);
}

async function restart() {
  if (process.argv.includes('-debug')) console.log(cli + 'CLI: received restart event, loading...' + rs);
  instance = await Matterbridge.loadInstance(true);
  registerHandlers();
}

async function update() {
  if (process.argv.includes('-debug')) console.log(cli + 'CLI: received update event, updating...' + rs);
  // TODO: Implement update logic outside of matterbridge
  instance = await Matterbridge.loadInstance(true);
  registerHandlers();
}

process.title = 'matterbridge';

// Remove all existing listeners for uncaughtException and unhandledRejection
process.removeAllListeners('uncaughtException');
process.removeAllListeners('unhandledRejection');

// Register new listeners for uncaughtException
process.on('uncaughtException', (error) => {
  console.error(er + 'CLI: Matterbridge Unhandled Exception detected at:', error.stack || error, rs);
  process.exit(1);
});

// Register new listeners for unhandledRejection
process.on('unhandledRejection', (reason, promise) => {
  console.error(er + 'CLI: Matterbridge Unhandled Rejection detected at:', promise, 'reason:', reason instanceof Error ? reason.stack : reason, rs);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error(er + `CLI: Matterbridge.loadInstance() failed with error: ${error}` + rs);
});
