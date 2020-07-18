import * as Bull from "bull";
import { config, getApiConfig } from "../Config";
import { Logger } from "../logging/Logger";
import { OrderStatus } from "../model/OrderStatus";
import * as axios from "axios";

export default class OrderQueue {
  private logger = new Logger("OrderQueue");
  private orderQueue: Bull.Queue;

  constructor() {
    this.orderQueue = new Bull("justjava-order-queue", {
      redis: config.redis.url,
    });

    this.orderQueue
      .isReady()
      .then(() => {
        this.logger.info("Started order queue");
        this.observeEvents();
        this.startProcessing();
      })
      .catch(e => {
        this.logger.error(e.message);
      });
  }

  private observeEvents() {
    this.orderQueue.on("global:stalled", jobId => {
      this.logger.warn(`[${jobId}] STALLED`);
    });

    this.orderQueue.on("global:completed", jobId => {
      this.logger.debug(`[${jobId}] COMPLETED`);
    });

    this.orderQueue.on("global:failed", async jobId => {
      const job = await this.orderQueue.getJob(jobId);
      this.logger.error(`[${jobId}] FAILED: ${job.toJSON().failedReason}`);
    });
  }

  private startProcessing() {
    this.orderQueue.process(async (job, done) => {
      const serviceName = job.data.serviceName;
      const orderId = job.data.orderId;
      const orderStatus = job.data.orderStatus;

      if (!serviceName || !orderId || !orderStatus) {
        await job.discard(); // Prevent retring the job
        done(new Error(`Invalid data ${JSON.stringify(job.data)}`));
        return;
      }
      if (!Object.values(OrderStatus).includes(orderStatus)) {
        await job.discard();
        done(new Error(`Invalid order status: ${orderStatus}`));
        return;
      }

      try {
        if (orderStatus === OrderStatus.CONFIRMED) {
          await this.startOrderSequence(job.id, serviceName, orderId);
        } else {
          await this.proceedWithOrderSequence(
            job.id,
            serviceName,
            orderId,
            orderStatus,
          );
        }
        done();
      } catch (error) {
        if (error.response) {
          done(new Error(JSON.stringify(error.response.data)));
        } else {
          done(error.message);
        }
      }
    });
  }

  private async startOrderSequence(
    jobId: number | string,
    serviceName: string,
    orderId: string,
  ) {
    this.logger.debug(
      `[${jobId}] Starting order sequence for order ${orderId}`,
    );

    // Schedule order to be in progress after 30s
    this.logger.debug(`[${jobId}] Scheduling order to be IN_PROGRESS`);
    await this.orderQueue.add(
      {
        serviceName,
        orderId,
        orderStatus: OrderStatus.IN_PROGRESS,
      },
      {
        delay: config.queue.delay / 2,
        attempts: 3,
        backoff: { type: "fixed", delay: 5000 },
      },
    );
  }

  private async proceedWithOrderSequence(
    jobId: number | string,
    serviceName: string,
    orderId: string,
    orderStatus: OrderStatus,
  ) {
    this.logger.debug(`[${jobId}] Setting order ${orderId} to ${orderStatus}`);

    const apiConfig = getApiConfig(serviceName);

    // Make api request to update status
    await axios.default({
      method: "POST",
      url: `${apiConfig.endpoint}/admin/orders/${orderId}/orderStatus`,
      headers: {
        "admin-key": apiConfig.adminKey,
      },
      data: { orderStatus },
    });

    if (orderStatus !== OrderStatus.IN_PROGRESS) {
      this.logger.debug(
        `[${jobId}] Ignoring ${orderStatus} status of order ${orderId}`,
      );
      return;
    }

    // Schedule order to be completed
    this.logger.debug(`[${jobId}] Scheduling order to be COMPLETED`);
    await this.orderQueue.add(
      {
        serviceName,
        orderId,
        orderStatus: OrderStatus.COMPLETED,
      },
      {
        delay: config.queue.delay,
        attempts: 3,
        backoff: { type: "fixed", delay: 5000 },
      },
    );
  }
}
