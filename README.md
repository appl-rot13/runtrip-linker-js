[English](README.md) | [日本語](README.ja.md)

# Runtrip Linker

[![GitHub Actions](../../actions/workflows/test.yml/badge.svg)](../../actions)

An application that posts your Runtrip journals to X (Twitter).

## Overview

Periodically checks your Runtrip, and posts any new journals to X (Twitter).  
The posted text will be as follows. If the character limit is exceeded, parts of the journal text will be omitted.

```
[Journal text]
[Hashtags]
[Journal URL]
```

## Requirements

- Cloudflare Workers
- [Node.js](https://nodejs.org/)

## Dependencies

- Cloudflare Workers Node.js compatibility
  - [node:buffer](https://developers.cloudflare.com/workers/runtime-apis/nodejs/buffer/)
  - [node:crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [oauth-1.0a](https://github.com/ddo/oauth-1.0a)
- [twitter-text](https://github.com/twitter/twitter-text)

## Usage

### 0. Preparations

Run the following command to log in to Cloudflare.

```sh
npx wrangler login
```

### 1. Set Up Wrangler File

Set up the `wrangler.jsonc` file to match your environment.

#### KV Settings

Run the following command to create a new KV namespace.

```sh
npx wrangler kv namespace create KV
```

Update the id field with the generated ID.

```json
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "d99a1e428eb042f6ad2adfe5b1829c9e"
  }
],
```

#### Cron Trigger Settings

Set the interval to check for new journals as needed. The default is 10 minutes.

```json
"triggers": {
  "crons": [
    "*/10 * * * *"
  ]
},
```

### 2. Set Up Secrets

> [!TIP]
> When running locally, use a `.env` file instead of Secrets.  
> Create a `.env` file based on the `.env.example` file.

#### Runtrip Settings

Set your Runtrip user ID.

```sh
npx wrangler secret put RUNTRIP_USER_ID
```

#### X (Twitter) Settings

Obtain and set the following credentials from [X (Twitter) Developer Console](https://console.x.com/).

```sh
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_KEY_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET
```

### 3. Deploy

Run the following command to deploy to Cloudflare.

```sh
npx wrangler deploy
```

## License

This software is licensed under the [Unlicense](LICENSE).
