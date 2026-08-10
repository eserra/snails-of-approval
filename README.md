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

## Admin operations

Operational scripts live in `prisma/` and take the target database from
`DATABASE_URL`. To run one against **production**, prefix it with the production
connection string (never commit it):

```bash
DATABASE_URL="<production connection string>" <command>
```

### Reset a user's password

For a locked-out user (e.g. a forgotten admin password). Signed-in users can
change their own password from **`/admin/account`**; this script is the recovery
path for when you can't log in.

```bash
# note the leading space — keeps the password out of shell history
 DATABASE_URL="<prod>" npx tsx prisma/set-password.ts <email> '<new-password>'
```

It hashes with bcrypt (cost 12, matching the app) and **looks the user up
first**, so a wrong or renamed email fails loudly instead of silently updating
nothing. Note that production accounts use the `@slowfoodnyc.org` domain.

### Seed categories

Populates (or refreshes) the SFUSA category taxonomy without touching users or
chapters — safe to run against production:

```bash
DATABASE_URL="<prod>" npm run seed:categories
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
