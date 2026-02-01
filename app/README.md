This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Telegram setup

### Required env vars
- `TELEGRAM_BOT_TOKEN`
- `TOOLS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_BASE_URL` (your public HTTPS URL for Telegram webhook)

Optional:
- `TELEGRAM_WEBHOOK_SECRET`

### Run dev server
```bash
npm run dev
```

### Set webhook
```bash
PUBLIC_BASE_URL="https://your-public-url" TELEGRAM_BOT_TOKEN="..." node app/scripts/set-telegram-webhook.mjs
```

If you set `TELEGRAM_WEBHOOK_SECRET`, Telegram will send it back in the header `x-telegram-bot-api-secret-token`.

### Test with curl
Health check:
```bash
curl -i http://localhost:3000/api/health
```

Webhook:
```bash
curl -i -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"text":"summary","date":1700000000,"chat":{"id":123456,"type":"private"},"from":{"id":999,"is_bot":false,"first_name":"Test"}}}'
```

### Public URL
Telegram requires a public HTTPS URL. Use ngrok or Cloudflare Tunnel to expose your local dev server.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
