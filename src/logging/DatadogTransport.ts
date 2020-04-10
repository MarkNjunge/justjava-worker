import * as axios from "axios";
import * as Transport from "winston-transport";
import { config } from "../Config";

export class DatadogTransport extends Transport {
  private apiUrl = "";

  constructor(opts) {
    super(opts);

    this.apiUrl = `https://http-intake.logs.datadoghq.com/v1/input?service=${config.datadog.service}&ddsource=${config.datadog.source}&host=${config.datadog.host}&ddtags=`;
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const name = info.message.split("[")[1].split("]")[0];
    const message = info.message.split(`[${name}]`)[1].trim();

    let body: any = { name, message, level: info.level };

    if (info.meta) {
      if (info.meta.stacktrace != null) {
        body = {
          ...body,
          error: {
            stack: info.meta.stacktrace,
          },
        };
      }
    }

    await axios.default({
      method: "POST",
      url: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": config.datadog.apiKey,
      },
      data: JSON.stringify(body),
    });

    callback();
  }
}
