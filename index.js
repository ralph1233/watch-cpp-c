#!/usr/bin/env node

import { spawn } from "child_process";
import chokidar from "chokidar";
import readline from "readline";
import path from "path";
import os from "os";
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

// Get the file from the arguments and the rest as compiler flags and additional args
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
  compilerFlags.push(process.argv[i]); // The flags are between the file and additionalArgs
  i++;
}

additionalArgs.push(...process.argv.slice(i, process.argv.length));

console.log(chalk.green(`Watching ${file} for changes...`));

const outputFile =
  path.basename(file, path.extname(file)) +
  (os.platform() === "win32" ? ".exe" : "");

// Function to compile and run the file
const compileAndRun = () => {
  console.log(chalk.blue(`Compiling ${file}...`));

  // Determine whether to use gcc or g++ based on file extension
  const compiler = file.endsWith(".cpp") ? "g++" : "gcc";

  // Compile with additional flags
  const compileProcess = spawn(
    compiler,
    [file, "-o", outputFile, ...compilerFlags],
    {
      stdio: ["pipe", "pipe", "pipe"], // Allow interaction with stdin, stdout, and stderr
    }
  );

  compileProcess.stderr.on("data", (data) => {
    console.error(chalk.red(`Compilation error: ${data.toString()}`));
  });

  compileProcess.on("close", (code) => {
    if (code === 0) {
      console.log(chalk.green(`Compiled successfully: ${outputFile}`));
      console.log(chalk.cyan("Running the program...\n"));

      // Pass additional arguments to the compiled program (argv[])
      const runProcess = spawn(
        os.platform() === "win32" ? `${outputFile}` : `./${outputFile}`,
        additionalArgs, // These are the argv that will be passed to the program
        {
          stdio: "inherit",
        } // Inherit stdin, pipe stdout/stderr
      );

      runProcess.on("close", () => {
        console.log(
          chalk.yellow("\nType 'rs' and press Enter to restart the program")
        ); // After the program finishes running, allow manual restart
        enableRestart();
      });
    } else {
      console.error(chalk.red("Compilation failed."));
    }
  });
};

let rl; // Declare readline interface outside to keep track of it

const enableRestart = () => {
  if (rl) {
    rl.close(); // Close the previous instance before creating a new one
  }

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    if (input.trim() === "rs") {
      console.log(chalk.magenta("Manual restart triggered..."));
      compileAndRun();
    }
  });
};

// Initial Compilation and Run
compileAndRun();

// Watch for file changes and recompile & run
chokidar
  .watch(file, {
    usePolling: true, // Enable polling to watch for changes
    interval: 1000, // Polling interval (adjust as needed)
  })
  .on("change", () => {
    console.log(chalk.yellow(`File ${file} changed! Recompiling...`));
    compileAndRun();
  });
