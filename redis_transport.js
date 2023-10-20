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
 * @param {string} opts.redisUrl - redis connection url
 * @param {string} opts.redisOptions - redis connection options
 * @param {string} opts.redisPrefix - redis key prefix
 * @param {string} opts.redisKey - redis channel or key
 * @param {boolean} opts.useLevelSuffix - use level suffix
 * @param {string} opts.redisDatatype - redis datatype (list, set, zset, pubsub, stream)
 * @param {string} opts.redisAddCmd - redis command to add data (rpush, sadd, zadd, publish, xadd)
 * @returns {object} pino transport object
 */
module.exports = async function (opts) {

    let redis = null

    const redisUrl = opts.redisUrl || 'redis://localhost:6379/?enableAutoPipelining=true'
    const redisOptions = opts.redisOptions || null;
    const redisClient = opts.redisClient || null;
    const redisPrefix = opts.redisPrefix || 'LOG:'
    const redisKey = opts.redisKey || 'pino'
    const useLevelSuffix = opts.useLevelSuffix || false
    const redisDatatype = opts.redisDatatype || 'list'
    const redisAddCmd = opts.redisAddCmd || 'rpush'
    const levelText = opts.levelText || false

    if (redisClient) {
        redis = redisClient
    } else if (redisUrl) {
        let Redis = require('ioredis');
        redis = new Redis(redisUrl);
    } else {
        let Redis = require('ioredis');
        redis = new Redis(redisOptions);
    }

    /**
     * Adds a command to Redis with the given key and value.
     * @param {string} key - The key to add to Redis.
     * @param {string} value - The value to add to Redis.
     * @returns {Promise} - A Promise that resolves when the command has been added to Redis.
     */
    let addCmd = function (key, value) {
        return redis[redisAddCmd](key, value);
    }

    switch (redisDatatype) {
        case 'list':
            addCmd = function (key, value) {
                return redis.rpush(key, value)
            }
            break;
        case 'set':
            addCmd = function (key, value) {
                return redis.sadd(key, value)
            }
            break;
        case 'zset':
            addCmd = function (key, value) {
                return redis.zadd(key, Date.now(), value)
            }
            break;
        case 'pubsub':
            addCmd = function (key, value) {
                return redis.publish(key, value)
            }
            break;
        case 'stream':
            addCmd = function (key, value) {
                return redis.xadd(key, '*', 'data', value)
            }
            break;
        default:
            break;
    }

    return build(async function (source) {
        for await (let obj of source) {
            let suffix = '';
            if (useLevelSuffix === true || useLevelSuffix === 'true') {
                suffix = ':' + obj.level;
            }

            if (levelText) {
                obj.level = debugLevels[obj.level]
            }

            if (LOG_DEBUG === "true") {
                console.log('redisPrefix + redisKey + suffix', redisPrefix + redisKey + suffix)
                console.log('JSON.stringify(obj)', JSON.stringify(obj))
            }
            await addCmd(redisPrefix + redisKey + suffix, JSON.stringify(obj));
        }
    })
}