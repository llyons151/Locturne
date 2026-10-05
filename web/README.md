# locturne.com

> **Not deployed. Superseded on 2026-10-04.** This folder is the October 3 first draft. The
> live site is the separate `locturne_landing` Astro repo (`~/Documents/Projects/locturne_landing`),
> deployed on Cloudflare: edit Terms, Privacy and Support there. See
> [docs/WEBSITE.md](../docs/WEBSITE.md).

The website: a waitlist landing page (`/`), the Privacy Policy (`/privacy`) and the Terms
of Use (`/terms`). Plain HTML and CSS on Cloudflare Pages, with one Pages Function
(`functions/api/waitlist.ts`) that stores sign-ups in Cloudflare D1. Background and open
questions: [docs/WEBSITE.md](../docs/WEBSITE.md).

```
web/
  public/              the static site (Pages serves privacy.html at /privacy)
    index.html         landing + waitlist form
    privacy.html       Privacy Policy
    terms.html         Terms of Use
    thanks.html        shown after a no-JavaScript sign-up
    404.html
    styles.css, waitlist.js, assets/, _headers, robots.txt, sitemap.xml
  functions/api/waitlist.ts   POST /api/waitlist
  schema.sql           D1 table
  wrangler.toml        Pages project + D1 binding
```

All commands below run from this `web/` folder.

## 0. Before the first deploy

1. Fill every placeholder in the legal pages: `grep -rn -i todo public/`. They're
   highlighted yellow on the page so you can't miss them.
2. Make sure `hello@locturne.com` receives mail (step 6 below), or change the address in
   `public/*.html`.

## 1. Install and log in (once)

```sh
npm install
npx wrangler login          # opens the browser; log in to your Cloudflare account
```

## 2. Create the database (once)

```sh
npx wrangler d1 create locturne-waitlist
```

Copy the `database_id` it prints into `wrangler.toml` (replace
`REPLACE_WITH_D1_DATABASE_ID`), then create the table:

```sh
npx wrangler d1 execute locturne-waitlist --remote --file=./schema.sql
```

## 3. Deploy

```sh
npx wrangler pages deploy
```

The first run asks to create the project; accept the name `locturne-web` and production
branch `main`. It prints a `https://locturne-web.pages.dev` URL. Re-run the same command to
publish changes.

The D1 binding comes from `wrangler.toml`. If the form returns errors after deploying,
check the dashboard: Workers & Pages → locturne-web → Settings → Bindings should list
`DB → locturne-waitlist`. If not, add it there and redeploy.

## 4. Test it

Open the pages.dev URL on your phone, sign up with a real address using a tag, e.g.
`https://locturne-web.pages.dev/?src=test`, then:

```sh
npm run signups:by-source
```

## 5. Custom domain

Dashboard → Workers & Pages → locturne-web → Custom domains → Set up a domain:

- add `locturne.com`
- add `www.locturne.com` too, then a Redirect Rule (Rules → Redirect Rules) sending
  `www.locturne.com/*` to `https://locturne.com/${1}` with 301.

If the domain's DNS is already on Cloudflare, the records are created for you; SSL is
issued within a few minutes. The app's `LEGAL_URLS` already point at
`https://locturne.com/privacy` and `/terms`, so check both load before App Review.

## 6. Email for hello@locturne.com (free)

Dashboard → locturne.com → Email → Email Routing → enable, then add a custom address
`hello@locturne.com` forwarding to your inbox. Cloudflare adds the MX/TXT records.

## 7. Sign-ups

```sh
npm run signups:count        # how many
npm run signups:by-source    # per ?src= tag (falls back to utm_campaign, then referrer)
npm run signups:export > signups.json   # everyone still subscribed, as JSON
```

As CSV (needs `jq`):

```sh
npm run --silent signups:export | jq -r '.[0].results | (.[0] | keys_unsorted) as $k | ($k | @csv), (.[] | [.[$k[]]] | @csv)' > signups.csv
```

`signups*.json` and `signups*.csv` are git-ignored: never commit the list.

Handling requests:

```sh
# unsubscribe (keeps the row for counts)
npx wrangler d1 execute locturne-waitlist --remote --command "UPDATE signups SET unsubscribed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = 'someone@example.com'"
# delete on request
npx wrangler d1 execute locturne-waitlist --remote --command "DELETE FROM signups WHERE email = 'someone@example.com'"
```

## Tagging video links

Put one tag per video on the bio link and change it when a new video goes up, e.g.
`locturne.com/?src=tt-stairs-01`. Tags are letters, digits and `. _ ~ + -`, up to 64
characters; anything else is dropped. Each sign-up keeps the first tag it came with.
Standard `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term` work too.
Sign-ups per 1K views = sign-ups for that tag ÷ the video's views × 1000 (GAME_PLAN: about
1+ is working, under 0.3 means change the hook).

## Local development

```sh
npm run db:schema:local
npm run dev                  # http://localhost:8788, with a local D1
```

## If spam shows up

The function already has a honeypot, a 1.5 s time trap and a same-origin check. If that
isn't enough: dashboard → locturne.com → Security → WAF → Rate limiting rules, e.g. 5
requests per minute per IP to `/api/waitlist`. Turnstile is the next step after that.

## Rules

- No glow of any kind (CLAUDE.md). No trackers, cookies or third-party scripts: the
  Privacy Policy says the site has none, and `_headers` enforces it with a strict CSP.
- If you add analytics (even Cloudflare Web Analytics) or an email service, update
  `privacy.html` section 5 first.
