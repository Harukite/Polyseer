# Scripts

Utility scripts for local development.

## `npm run test:kalshi`

Checks Kalshi API connectivity and market payload parsing:

```bash
npm run test:kalshi
```

Example market URLs that the parser accepts:

**Polymarket**
- `https://polymarket.com/event/fed-decision-in-october`

**Kalshi**
- `https://kalshi.com/markets/kxfeddecision/fed-meeting/KXFEDDEC-25DEC18`
- `https://kalshi.com/markets/kxfeddecision/fed-meeting` (series URL, resolves to the most active market)
