import * as winston from 'winston';
import { Logger, format, transports } from 'winston';

// Create the logger with explicit types
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'token-pool-calldata' } as const,
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
}) satisfies Logger;

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  );
}

// Export the logger instance
export default logger;
