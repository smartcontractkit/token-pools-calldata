/**
 * @fileoverview Core interfaces for dependency injection and abstraction.
 *
 * This module exports all interface definitions used throughout the application
 * for dependency injection, testing, and loose coupling between components.
 *
 * @module interfaces
 */

export { ILogger } from './ILogger';
export { IInterfaceProvider } from './IInterfaceProvider';
export { IAddressComputer } from './IAddressComputer';
export { IOutputWriterFactory, IOutputWriter, OutputDestination } from './IOutputWriterFactory';
