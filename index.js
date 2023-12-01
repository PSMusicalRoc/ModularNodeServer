const helptext = `Roc's Modular Server
Usage: node index.js port=[port] <options>

Options:
enable      Takes a comma separated list of modules and mountpoints to
            initialize on startup. If any modules have
            spaces in the name, use quotes. Do NOT
            separate the comma separated list with spaces!
            Example: enable=helloworld:/hi,test:/mountpoint

default     Specifies the default "root" module for the server.
            When the user goes to "server.com/", they will go
            to whatever is defined here. If not defined, the
            first module enabled will be the root. If no modules
            are enabled at startup, the root will simply not exist.
`

// Server Flags

let coloredOutput = false;

// End Server Flags


// Server Options

let port = 0;

/**
 * The list of enabled server modules. Will have
 * the properties:
 * - moduleName: The display name of the module (and the folder
 *   the module resides in).
 * - serverPath: The base path the router uses for the module.
 *   Needed for removing the module at a later date.
 */
let currentlyEnabled = [];
let enable = [];
let defaultRoot = null;

// End Server Options


// Begin Server Function Definitions

/**
 * Turns on a server module, thus allowing clients to connect
 * to those applications.
 *
 * @async
 *
 * @param {String} moduleName The name of the module to initialize.
 * Said name should correspond to a folder in ServerModules!
 *
 * @param {String} serverPath The base pathname to set the module
 * to on the server (ex. if serverPath = "helloworld", the client
 * can access the module at server.com/helloworld)
 *
 * @returns {Promise<String>} A promise that resolves or rejects to
 * a string. Said string indicates whether the function passed or failed.
 */
async function enableServerModule(moduleName, serverPath) {
  return new Promise((resolve, reject) => {
    for (const module of currentlyEnabled) {
      if (module.moduleName === moduleName) {
        resolve(`${moduleName} is already loaded at ${module.serverPath}`);
      }
    }
    try {
      import(`./ServerModules/${moduleName}/index.js`)
        .then((serverModule) => {
          app.use(serverPath, serverModule.default.router);
          currentlyEnabled.push({
            moduleName: moduleName,
            serverPath: serverPath,
            module: serverModule.default
          });
          if (defaultRoot == null) {
            defaultRoot = serverPath;
          }
          resolve(`Successfully loaded and enabled ${moduleName} at path ${serverPath}!`);
        })
        .catch((reason) => {
          console.log(reason);
          reject(`Enabling servermodule ${moduleName} failed: ${reason}.`);
        });
    }
    catch(err) {
      reject("Provided server module either does not exist or is not a valid serverModule!");
    }
  });
}

/**
 *
 */
function disableServerModule(moduleName, serverPath) {
  for (const module_num in currentlyEnabled) {
    const module = currentlyEnabled[module_num];
    if (module.moduleName === moduleName) {
      for (const route_num in app._router.stack) {
        if (app._router.stack[route_num].name === "router") {
          if (app._router.stack[route_num].handle.stack === module.module.router.stack) {
            // we've found our route to delete.
            app._router.stack.splice(route_num, 1);
            currentlyEnabled.splice(module_num, 1);
            return `Module ${moduleName} disabled!`;
          }
        }
      }
    }
  }
  return `Module ${moduleName} is not loaded yet. No action taken.`;
}

// End Server Function Definitions

import {parseARGV} from "./ServerFunctions/parseARGV.js"

import express from "express";
const app = express();

const argv = parseARGV(process.argv.slice(2));

if (argv.flags.includes("--help")) {
  console.log(helptext);
  process.exit();
}

if (argv.flags.includes("--color")) {
  coloredOutput = true;
}

for (const arg of argv.options) {
  if (arg.key === "port") {
    port = parseInt(arg.value);
  }
  if (arg.key === "enable") {
    enable = arg.value.split(",");
  }
  if (arg.key === "default") {
    defaultRoot = arg.value;
  }
}

if (port === 0) {
  console.log("NO PORT SPECIFIED\n");
  console.log(helptext);
  process.exit();
}

app.use(express.json());

for (const newmodule of enable) {
  const mod_split = newmodule.split(":");
  try {
    const output = await enableServerModule(mod_split[0], mod_split[1]);
    console.log(output);
  } catch(err) {
    console.log(`Module loading error: ${err}`);
  }
}

let defaultRootParsing = await new Promise((res, rej) => {
  if (defaultRoot != null) {
    for (const module of currentlyEnabled) {
      if (module.moduleName === defaultRoot) {
        res(module.serverPath);
      }
    }
  }
  res(null);
});

if (defaultRootParsing == null && currentlyEnabled.length > 0) {
  const module = currentlyEnabled[0];
  defaultRootParsing = module.serverPath;
}

defaultRoot = defaultRootParsing;

app.get("/", (req, res) => {
  if (defaultRoot == null) {
    res.sendStatus(404);
  }
  else {
    res.redirect(defaultRoot);
  }
});

// Inquirer Prompts

import {input} from "@inquirer/prompts";

const instance = app.listen(port, () => {
  console.log(`Listening on 127.0.0.1:${port}!`);
});

let serverContinue = true;

while (serverContinue) {
  const cmdline = await input({ message: "> "});
  const cmd_split = cmdline.split(" ");
  if (cmd_split[0] === "") { }
  

  else if (cmd_split[0] === "quit") {
    console.log("Quitting server!");
    instance.close();
    serverContinue = false;
  }


  else if (cmd_split[0] === "clear") {
    console.clear();
  }


  else if (cmd_split[0] === "enable") {
    if (cmd_split.length < 3) {
      console.log("Command 'enable' requires at least 2 arguments: enable <modulename> <serverpath>");
      continue;
    }
    const output = await enableServerModule(cmd_split[1], cmd_split[2]);
    console.log(output);
  }


  else if (cmd_split[0] === "disable") {
    if (cmd_split.length < 2) {
      console.log("Command 'disable' requires at least 1 argument: disable <modulename>");
      continue;
    }
    const output = disableServerModule(cmd_split[1]);
    console.log(output);
  }


  else if (cmd_split[0] === "list") {
    if (currentlyEnabled.length === 0) {
      console.log("There are no currently enabled modules.");
      continue;
    }
    for (const module of currentlyEnabled) {
      console.log(`Module ${module.moduleName} currently mounted at ${module.serverPath}`);
    }
  }


  else if (cmd_split[0] === "help") {
    console.log(`
SERVER COMMANDS:

enable <modulename> <serverpath>
      Enables the module located at 'ServerModules/<modulename>'
      and mounts it on the server at 'server.com:port/<serverpath'.

disable <modulename>
      If the module is currently loaded, disables it by removing
      all routes that would lead to it. Does nothing if the module
      is not loaded.

list
      Lists all currently enabled modules.

CONSOLE COMMANDS:

clear     Attempt to clear the console
help      Display help message
quit      Quit server
`)
  }
  else {
    console.log(`'${cmd_split[0]}' is not a command recognized. Type 'help' for command list.`);
  }
}
