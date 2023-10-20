const build = require('pino-abstract-transport')

const LOG_DEBUG = process.env.LOG_DEBUG || "false"

const debugLevels = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
}

/**
 * Pino transport for Redis
 * @module pino_redis_transport
 * @param {object} opts - options object
 * @param {string} opts.amqpUrl - connection url
 * @param {string} opts.exchange - exchange
 * @param {object} opts.exchangeType - exchange type
 * @param {string} opts.routingKey - routing key
 * @param {object} opts.queueName - queue name
 * @param {object} opts.assertOptions - assert options
 * @param {boolean} opts.messageOptions - message options
 * @returns {object} pino transport object
 */
module.exports = async function (opts) {
    let amqp = null

    const amqpUrl = opts.amqpUrl || 'amqp://localhost:5672';
    const amqpClient = opts.amqpClient || null;
    const exchange = opts.exchange || '';
    const exchangeType = opts.exchangeType || 'fanout';
    const routingKey = opts.routingKey || '';
    const queue = opts.queue || '';
    const assertOptions = opts.assertOptions || { durable: true };
    const messageOptions = opts.messageOptions || { expiration: 3600000 };
    const levelText = opts.levelText || false

    if (amqpClient) {
        amqp = amqpClient
    } else if (amqpUrl) {
        const amqpLib = require('amqp-connection-manager');
        const connection = await amqpLib.connect(amqpUrl);
        const channel = await connection.createChannel({
            json: true,
            setup: function (channel) {
                if (queue && queue !== '' && !exchange || exchange === '') {
                    return channel.assertQueue(queue, assertOptions);
                } else if (exchange && exchange !== '') {
                    return channel.assertExchange(exchange, exchangeType, assertOptions);
                } else {
                    throw new Error('queueName or routingKey is required');
                }
            },
        });
        amqp = channel;
    } else {
        throw new Error('amqpUrl or amqpClient is required');
    }

    /**
     * Send a message to the exchange.
     * @param {string} key - Exchange name.
     * @param {string} value - The value to add to exchange.
     * @returns {Promise} - A Promise that resolves when the command has been added to exchange.
     */
    let addCmd = function (exchange, queue, value) {
        return amqp.publish(exchange, queue, value, messageOptions);
    }

    return build(async function (source) {
        for await (let obj of source) {

            if (levelText) {
                obj.level = debugLevels[obj.level]
            }

            if (LOG_DEBUG === "true") {
                console.log('[LOG] pino_rabbitmq_transport.js: obj = ', obj)
            }

            addCmd(exchange, queue, obj);
        }
    });
}