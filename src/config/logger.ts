import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports to use based on environment
const transports: winston.transport[] = [
  // Always write logs to console
  new winston.transports.Console(),
];

// Only add file transports in development (not in serverless environments like Vercel)
const env = process.env.NODE_ENV || 'development';
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

if (env === 'development' && !isServerless) {
  transports.push(
    // Write all errors to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default logger; 