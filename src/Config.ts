import * as dotenv from "dotenv";
dotenv.config();
import * as configPkg from "config";

interface Config {
  env: string;
  redis: Redis;
  api: Api;
  queue: Queue;
  logging: Logging;
  datadog: Datadog;
}

interface Redis {
  url: string;
}

interface Api {
  dev: ApiConfig;
  prod: ApiConfig;
}

interface ApiConfig {
  adminKey: string;
  endpoint: string;
}

interface Queue {
  delay: number;
}

interface Logging {
  timestampFormat: string;
}

interface Datadog {
  enabled: string;
  apiKey: string;
  service: string;
  source: string;
  host: string;
}

export const config: Config = configPkg;

export function asBool(value: boolean | string) {
  if (typeof value === "string") {
    return value === "true" ? true : false;
  } else if (typeof value === "boolean") {
    return value;
  }
}

// const logger = new Logger("Config");

export function getApiConfig(serviceName: string): ApiConfig {
  switch (serviceName) {
    case "dev.justjava":
      return config.api.dev;
    case "api.justjava":
      return config.api.prod;
    default:
      // logger.error(
      //   `Unknown service name ${serviceName}. Using dev as default.`,
      // );
      return config.api.prod;
  }
}
