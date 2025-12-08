/**
 * Output writer factory interface
 */

/**
 * Output destination type
 */
export type OutputDestination = { type: 'console' } | { type: 'file'; path: string };

/**
 * Output writer interface
 */
export interface IOutputWriter {
  /**
   * Write content to destination
   */
  write(content: string, destination: OutputDestination): Promise<void>;
}

/**
 * Factory for creating output writers
 */
export interface IOutputWriterFactory {
  /**
   * Create a calldata writer
   */
  createCalldataWriter(): IOutputWriter;

  /**
   * Create a JSON writer
   */
  createJsonWriter(): IOutputWriter;
}
