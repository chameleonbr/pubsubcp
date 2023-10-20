#!/usr/bin/env node

const { Command, Argument, Option } = require('commander');
const fs = require('fs');
const util = require('util');
const { send } = require('process');
const program = new Command();
const redis = require('ioredis');
const path = require('path');

const fsRead = util.promisify(fs.readFile)

const fsWrite = util.promisify(fs.writeFile)

const fsAppend = util.promisify(fs.appendFile)

let writeStreams = {};

/**
 * convert string to base64url
 * @param {string} str
 * @returns
 */
function base64UrlEncode(str) {
    return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
/**
 * convert base64url to string
 * @param {string} str 
 * @returns 
 */
function base64UrlDecode(str) {
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

const redisServer = process.env.REDIS_SERVER_URL || 'redis://localhost:6379'
//script uses redis pubsub to send and receive files using base64

const sendFile = async (file, options) => {
    const redis_url = options.redis || redisServer;
    const channel = options.channel || 'REDIS:';
    let filename = path.basename(file);
    console.log('Sending file: ' + filename);
    const channelSender = channel + base64UrlEncode(filename);
    console.log('Connecting to redis server: ' + redis_url);
    const client = new redis(redis_url);
    console.log('Sending file: ' + file);
    let filedata = await fsRead(file);
    // Create a Redis sorted set to store the chunks of the file
    await client.del(channelSender);
    await client.set(channelSender, filedata);
    await client.publish(channelSender, 'newFile');
    console.log('File sent');
    client.quit();
    process.exit();
}

const receiveFile = async (options) => {
    const redis_url = options.redis || redisServer;
    const channel = options.channel || 'REDIS:';

    if (!options.dest) {
        options.dest = '.';
    }

    const client = new redis(redis_url);
    const client2 = new redis(redis_url);
    client.psubscribe(channel + '*');
    client.on('pmessage', async (_, channelRcv, message) => {

        let filename = base64UrlDecode(channelRcv.replace(channel, ''));
        let file = path.join(options.dest, filename);
        console.log('Receiving file: ' + filename);

        if (message === 'newFile') {
            let fileData = await client2.get(channelRcv);
            await fsWrite(file, fileData);
            await client2.del(channelRcv);
            console.log('File received: ' + file);
            client2.quit();
            client.quit();
            process.exit();
        }
    });
}

// map ctrl+c to exit
process.on('SIGINT', () => {
    process.exit();
});

program
    .name('Send and receive files using redis pubsub')
    .description('Send and receive files using redis pubsub')
    .version('1.0.2');

program.command('send')
    .addArgument(new Argument('<file>', 'File to send'))
    .addOption(new Option('-r, --redis <url>', 'URL of redis server'))
    .addOption(new Option('-c, --channel <channel>', 'Channel prefix, default is "REDIS:"'))
    .action(async (file, options) => {
        await sendFile(file, options);
    });

program.command('receive')
    .addOption(new Option('-d, --dest <folder>', 'Destination directory, default is current directory'))
    .addOption(new Option('-r, --redis <url>', 'URL of redis server'))
    .addOption(new Option('-c, --channel <channel>', 'Channel prefix, default is "REDIS:"'))
    .action(async (options) => {
        await receiveFile(options);
    });

program.parse(process.argv);