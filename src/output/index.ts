/**
 * @fileoverview Output module barrel export.
 *
 * This module re-exports all output writing functionality for CLI commands.
 * Provides access to both low-level output writers (Strategy pattern) and
 * high-level output service (Facade pattern).
 *
 * Exported Components:
 * - {@link OutputWriter} - Abstract base class for output writers
 * - {@link CalldataWriter} - Writer for raw hex calldata
 * - {@link JsonWriter} - Writer for formatted Safe JSON
 * - {@link OutputWriterFactory} - Factory for creating writers
 * - {@link OutputService} - High-level service for CLI output operations
 * - {@link OutputDestination} - Discriminated union for output destination (console/file)
 * - {@link OutputFormat} - Output format type ('calldata' or 'safe-json')
 *
 * @module output
 */

export * from './OutputWriter';
export * from './OutputService';
