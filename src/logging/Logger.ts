import * as winston from "winston";
import * as moment from "moment";
import { config, asBool } from "../Config";
import { DatadogTransport } from "./DatadogTransport";

export class Logger {
  constructor(private readonly name: string = "Application") {}

  info(message: string, name?: string) {
    winston.info(`[${name || this.name}] ${message}`);
  }
  error(message: string, name?: string, stacktrace?) {
    winston.error({
      message: `[${name || this.name}] ${message}`,
      meta: {
        stacktrace,
      },
    });
  }
  warn(message: string, name?: string) {
    winston.warn(`[${name || this.name}] ${message}`);
  }
  debug(message: string, name?: string) {
    winston.debug(`[${name || this.name}] ${message}`);
  }
  verbose(message: string, name?: string) {
    winston.verbose(`[${name || this.name}] ${message}`);
  }
}

export function initializeWinston() {
  const { combine, timestamp, printf, colorize } = winston.format;

  const myFormat = printf(({ level, message, logTimestamp }) => {
    const m = moment(logTimestamp);
    const formattedTimestamp = m.format(config.logging.timestampFormat);
    return `${formattedTimestamp} | ${level}: ${message}`;
  });

  winston.configure({
    level: "debug",
    format: combine(timestamp(), myFormat),
    transports: [
      new winston.transports.Console({
        format: combine(myFormat, colorize({ all: true })),
      }),
    ],
  });

  if (asBool(config.datadog.enabled) === true) {
    winston.add(new DatadogTransport({}));
  }
}
