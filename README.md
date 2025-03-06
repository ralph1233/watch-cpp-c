# C/C++ Watcher (cw)

`cw` is a simple CLI tool that automatically compiles and runs C/C++ files whenever they are modified, saving you time and effort.

## Installation

To install `cw` globally using npm, run:

```sh
npm install -g c_cpp-watcher
```

## Usage

```
cw <file.c or file.cpp> [compiler flags] [additional arguments]
```

## Example Usage

```
cw main.cpp -Wall -std=c++17
```

This command watches `main.cpp`, recompiles it with `-Wall` and `-std=c++17` flags, and runs the output.

- The compiled program **automatically restarts** when the file is modified.
- After execution, you can **type `rs` and press Enter** to restart manually.
