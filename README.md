This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Setup

The app uses these environment variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Local Development

1. Copy [.env.example](./.env.example) to [.env.local](./.env.local).
2. Update `DATABASE_URL` to point at your local Postgres database.
3. Set `NEXTAUTH_SECRET` to any long random string.
4. Keep `NEXTAUTH_URL` as `http://localhost:3000` while developing locally.

The app and maintenance scripts load `.env.local` first, then `.env`.

### Production

Set the same variables in your production host, for example Vercel, Railway, or your own server:

- `DATABASE_URL` should point at the production database.
- `NEXTAUTH_SECRET` should be a strong, unique secret.
- `NEXTAUTH_URL` should be your live domain, such as `https://app.yourdomain.com`.

If you self-host with env files, you can also use `.env.production` with the same values.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
