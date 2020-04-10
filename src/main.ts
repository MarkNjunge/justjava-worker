import { Logger, initializeWinston } from "./logging/Logger";
import OrderQueue from "./queues/order.queue";

async function main() {
  initializeWinston();
  const logger = new Logger();

  logger.info("*** Started application ***");

  new OrderQueue();
}
main();
