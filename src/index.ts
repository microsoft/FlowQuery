/**
 * FlowQuery - A declarative query language for data processing pipelines.
 *
 * Main entry point for the FlowQuery command-line interface.
 *
 * Build: 2026-04-04
 *
 * @packageDocumentation
 */
import CommandLine from "./io/command_line";

const commandLine = new CommandLine();
commandLine.loop();
