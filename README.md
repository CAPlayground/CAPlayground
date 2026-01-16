<table width="100%">
  <tr>
    <td align="right" width="120">
      <img src="apps/web/public/icon-dark.png" alt="CAPlayground Logo" width="100" />
    </td>
    <td align="left">
      <h1>CAPlayground</span></h1>
      <h3 style="margin-top: -10px;">Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer.</h3>
    </td>
  </tr>
</table>

## Overview

CAPlayground is a web-based Core Animation editor for making stunning wallpapers for your iPhone and iPad. Check out the [roadmap](https://caplayground.vercel.app/roadmap) to see progress.

## Getting Started

### Prerequisites

- Node.js 20+
- Bun

### Install
Install project dependencies:
```bash
bun install
```

### Development
To start the dev server:
```bash
bun run dev
```

Open http://localhost:3000 in your browser.

### Environment variables (optional for auth)

Authentication is powered by Supabase. If you don't provide auth keys, the site still runs, but account features are disabled and protected routes will show a message.

Create a `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Only required for server-side account deletion API
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

When these are missing:

- `app/signin/page.tsx` displays "Sign in disabled" and disables auth actions.
- `app/forgot-password/page.tsx` and `app/reset-password/page.tsx` show a notice and disable actions.
- `app/api/account/delete/route.ts` returns 501 with a clear message.

### Build & Start

```bash
bun run build && bun run start
```

## Contributing

Read [CONTRIBUTING.md](.github/CONTRIBUTING.md)

## License

[Creative Commons License](LICENSE)

**Note:** The Creative Commons License applies to the source code. Use of the hosted service at caplayground.vercel.app is subject to our [Terms of Service](https://caplayground.vercel.app/tos), which includes attribution requirements for shared content.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=caplayground/caplayground&type=Date)](https://www.star-history.com/#caplayground/caplayground&Date)
