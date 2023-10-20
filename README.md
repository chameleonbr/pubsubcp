chameleonbr: create a readme.md based on index.js, this project is used to send and receive files using Redis server.

GitHub Copilot: Here's a sample `README.md` file based on the `index.js` code you provided:

# Send and Receive Files using Redis PubSub

This project provides a simple way to send and receive files using Redis PubSub and String data. It uses the `ioredis` library to connect to a Redis server and send/receive files using base64 encoding.

## Installation

To use this project, you need to have Node.js and npm installed on your system. You can install the required dependencies by running the following command:

```
npm install
```

## Usage

To send a file, run the following command:

```
pubsubcp send <file> [-r <redis_url>] [-c <channel>]
```

- `<file>`: The file to send.
- `-r <redis_url>`: The URL of the Redis server. Default is `redis://localhost:6379`.
- `-c <channel>`: The channel prefix. Default is `REDIS:`.

To receive a file, run the following command:

```
pubsubcp receive [-d <folder>] [-r <redis_url>] [-c <channel>]
```

- `-d <folder>`: The destination directory. Default is the current directory.
- `-r <redis_url>`: The URL of the Redis server. Default is `redis://localhost:6379`.
- `-c <channel>`: The channel prefix. Default is `REDIS:`.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.