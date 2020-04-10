# JustJava Worker

Worker queue for [JustJava](https://justjava.store) to automatically update ths status of orders.

When a payment for an order is completed, it is set to `CONFIRMED` and added to the order queue. The queue schedules it to be set to `IN_PROGRESS` after 30s*. After it is set to `IN_PROGRESS`, it schedules it to be set to `COMPLETED` in 60s*.

Written using [Bull](https://github.com/OptimalBits/bull).

## Prerequisites

### Redis

Used for the queue.

1. Create a Redis instance and get the url in the form redis://:password@host:port/0

## Installation

1. Clone the repository

```bash
$ git clone https://github.com/MarkNjunge/justjava-worker.git
```

2. Make a `./config/local.json` or `./.env` file for configuration.  
   See the variable mappings [./config/custom-environment-variables.json](./config/custom-environment-variables.json).

```bash
$ cp ./config/default.json ./local.json
```

3. Install dependencies

```bash
$ yarn install
```

4. Start the server

```bash
$ yarn run start

# watch mode
$ yarn run start:dev
```
