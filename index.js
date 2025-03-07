#!/usr/bin/env node

import { spawn, execSync } from "child_process";
import chokidar from "chokidar";
import readline from "readline";
import path from "path";
import os from "os";
import fs from "fs";
import chalk from "chalk";

// Ensure we have the correct number of arguments
if (process.argv.length < 3) {
  console.error(
    chalk.red(
      "Usage: cw <file.c or file.cpp> [compiler flags] [additional arguments]"
    )
  );
  process.exit(1);
}

const file = process.argv[2];

if (!file.endsWith(".cpp") && !file.endsWith(".c")) {
  console.error(chalk.red("Error: Only .cpp and .c files are supported."));
  process.exit(1);
}

const compilerFlags = [];
const additionalArgs = [];

let i = 3; // Start checking arguments after the file

// Separate compiler flags from runtime arguments (argv)
while (i < process.argv.length && process.argv[i].startsWith("-")) {
  compilerFlags.push(process.argv[i]);
  i++;
}

additionalArgs.push(...process.argv.slice(i));

console.log(chalk.green(`Watching ${file} for changes...`));

const outputFile =
  path.basename(file, path.extname(file)) +
  (os.platform() === "win32" ? ".exe" : "");

let runProcess = null; // Store the currently running process
let rl = null;

const killProcess = () => {
  if (runProcess) {
    console.log(chalk.yellow("Stopping previous execution..."));
    runProcess.kill();
    runProcess = null;

    // Kill the process in case it's still running
    try {
      if (os.platform() === "win32") {
        execSync(`taskkill /IM ${outputFile} /F`, { stdio: "ignore" });
      } else {
        execSync(`pkill -f ${outputFile}`, { stdio: "ignore" });
      }
    } catch (err) {
      // Ignore errors if the process is not running
    }
  }

  // Close readline interface if it exists
  if (rl) {
    rl.close();
    rl = null;
  }
};

// Function to compile and run the file
const compileAndRun = () => {
  console.log(chalk.blue(`Compiling ${file}...`));

  const compiler = file.endsWith(".cpp") ? "g++" : "gcc";

  const compileProcess = spawn(
    compiler,
    [file, "-o", outputFile, ...compilerFlags],
    {
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  compileProcess.stderr.on("data", (data) => {
    console.error(chalk.red(`Compilation error: ${data.toString()}`));
  });

  compileProcess.on("close", (code) => {
    if (code === 0) {
      console.log(chalk.green(`Compiled successfully: ${outputFile}`));
      console.log(chalk.cyan("Running the program...\n"));

      // Close readline before starting the program to free up stdin
      if (rl) {
        rl.close();
        rl = null;
      }

      runProcess = spawn(
        os.platform() === "win32" ? `${outputFile}` : `./${outputFile}`,
        additionalArgs,
        {
          stdio: "inherit", // Use inherit to allow direct stdin access
        }
      );

      runProcess.on("close", () => {
        console.log(
          chalk.yellow(
            "\nProgram exited. Type 'rs' and press Enter to restart the program"
          )
        );
        // Only create readline after program exits
        enableRestart();
      });
    } else {
      console.error(chalk.red("Compilation failed."));
      enableRestart();
    }
  });
};

const enableRestart = () => {
  // Create a new readline interface only when needed
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    if (input.trim() === "rs") {
      console.log(chalk.magenta("Manual restart triggered..."));
      // Close readline to free up stdin before restarting
      rl.close();
      rl = null;
      compileAndRun();
    }
  });
};

// Initial Compilation and Run
compileAndRun();

chokidar
  .watch(file, {
    usePolling: true,
    interval: 1000,
  })
  .on("change", () => {
    console.log(chalk.yellow(`File ${file} changed! Recompiling...`));
    setTimeout(() => {
      killProcess(); // Kill the running process and remove old executable
      compileAndRun();
    }, 100); // Delay to ensure console.log happens before process exits
  });
