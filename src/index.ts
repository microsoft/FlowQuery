/**
 * FlowQuery - A declarative query language for data processing pipelines.
 *
 * Main entry point for the FlowQuery command-line interface.
 *
 * @packageDocumentation
 */

import CommandLine from "./io/command_line";

const commandLine = new CommandLine();
commandLine.loop();
