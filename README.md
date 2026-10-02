# Dar El Bon

Arabic RTL coffee storefront and administration dashboard. React + TypeScript + Vite, Express, and persistent SQLite on Node 24+.

See [README_AR.md](README_AR.md) for setup, admin access, verified workflows, deployment requirements, and the distinction between preview data and actual sales.

For hosting, use the included [Render Blueprint and Arabic deployment guide](DEPLOY_RENDER_AR.md). It requires a paid web service and persistent disk; deployment is initiated from the owner's Render account.

```bash
npm ci
npm run build
npm run admin:create
npm start
```

The initial storefront is in preview mode. Prices, weights, inventory, and the generated product photograph need business approval before actual sales. Payment-provider and shipping-provider integrations are not implemented. No public deployment has been performed.
