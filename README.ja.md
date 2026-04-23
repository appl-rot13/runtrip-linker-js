[English](README.md) | [日本語](README.ja.md)

# Runtrip Linker

[![GitHub Actions](../../actions/workflows/test.yml/badge.svg)](../../actions)

Runtripでの投稿をX(Twitter)に反映するアプリケーション。

## 概要

定期的に自身のRuntripをチェックし、新しい投稿があればその内容をX(Twitter)に投稿します。  
投稿されるテキストは以下の通りです。文字数が上限を超える場合、ジャーナル本文が一部省略されます。

```
[ジャーナル本文]
[ハッシュタグ]
[ジャーナルへのURL]
```

## 動作環境

- Cloudflare Workers
- [Node.js](https://nodejs.org/)

## 依存関係

- Cloudflare WorkersのNode.js互換
  - [node:buffer](https://developers.cloudflare.com/workers/runtime-apis/nodejs/buffer/)
  - [node:crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [oauth-1.0a](https://github.com/ddo/oauth-1.0a)
- [twitter-text](https://github.com/twitter/twitter-text)

## 使い方

### 0. 事前準備

以下のコマンドを実行し、Cloudflareにログインします。

```sh
npx wrangler login
```

### 1. Wranglerファイルの設定

`wrangler.jsonc` ファイルを環境に合わせて設定します。

#### KVの設定

以下のコマンドを実行し、KVネームスペースを作成します。

```sh
npx wrangler kv namespace create KV
```

表示されたIDに設定を変更します。

```json
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "d99a1e428eb042f6ad2adfe5b1829c9e"
  }
],
```

#### Cron Triggerの設定

必要に応じて、新着投稿の確認周期を変更します。デフォルトは10分です。

```json
"triggers": {
  "crons": [
    "*/10 * * * *"
  ]
},
```

### 2. Secretsの設定

> [!TIP]
> ローカルで動作させる場合、Secretsの代わりに `.env` ファイルを使用します。  
> `.env.example` ファイルを参考に `.env` ファイルを作成してください。

#### Runtrip関係の設定

[リンク先](https://support.runtrip.jp/hc/ja/articles/11246259860249)を参考にRuntripのユーザーIDを取得し、設定します。

```sh
npx wrangler secret put RUNTRIP_USER_ID
```

#### X(Twitter)関係の設定

[X(Twitter) Developer Console](https://console.x.com/)から以下の認証情報を取得し、設定します。

```sh
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_KEY_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET
```

### 3. デプロイ

以下のコマンドを実行し、Cloudflareにデプロイします。

```sh
npx wrangler deploy
```

## ライセンス

このソフトウェアは[Unlicense](LICENSE)に基づいてライセンスされています。

## 関連項目

- https://appl-rot13.hatenablog.jp/entry/2024/07/03/212921
