import { redact } from "./redact";
import { getCorrelationId } from "./correlation";
import { safeError } from "./safe-error";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
};

export type LoggerOptions = {
  level?: LogLevel;
  redactOptions?: Parameters<typeof redact>[1];
};

type LoggerMethod = (
  event: string,
  message: string,
  context?: Record<string, unknown>,
) => void;

export interface Logger {
  debug: LoggerMethod;
  info: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
  child: (context: Record<string, unknown>) => Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(configuredLevel: LogLevel, eventLevel: LogLevel): boolean {
  return LEVEL_ORDER[eventLevel] >= LEVEL_ORDER[configuredLevel];
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const configuredLevel = options.level ?? "info";
  const redactOptions = options.redactOptions;

  function buildEvent(
    level: LogLevel,
    event: string,
    message: string,
    extraContext?: Record<string, unknown>,
  ): LogEvent {
    const base: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
    };

    const correlationId = getCorrelationId();

    if (correlationId) {
      base.correlationId = correlationId;
    }

    if (extraContext && Object.keys(extraContext).length > 0) {
      base.context = redact(extraContext, redactOptions) as Record<
        string,
        unknown
      >;
    }

    return base;
  }

  function write(
    level: LogLevel,
    event: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    if (!shouldLog(configuredLevel, level)) {
      return;
    }

    const logEvent = buildEvent(level, event, message, context);
    const output = JSON.stringify(logEvent);

    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  const logger: Logger = {
    debug: (event, message, context) => write("debug", event, message, context),
    info: (event, message, context) => write("info", event, message, context),
    warn: (event, message, context) => write("warn", event, message, context),
    error: (event, message, context) => write("error", event, message, context),
    child: (context) => {
      const childLogger = createLogger(options);

      return {
        ...childLogger,
        debug: (event, message, extraContext) =>
          childLogger.debug(event, message, { ...context, ...extraContext }),
        info: (event, message, extraContext) =>
          childLogger.info(event, message, { ...context, ...extraContext }),
        warn: (event, message, extraContext) =>
          childLogger.warn(event, message, { ...context, ...extraContext }),
        error: (event, message, extraContext) =>
          childLogger.error(event, message, { ...context, ...extraContext }),
      };
    },
  };

  return logger;
}

export { redact, safeError };
