# MDC Arrest Calculator (standalone)

The **Arrest Calculator** from [MDC Panel+](https://github.com/b00skit/MDC-Panel-plus), split out into a
fully static site that runs on **GitHub Pages**: no server, no API keys.

- Pick charges, class, offense, addition (and DEPA drug category), with a parole violator toggle.
- Results: per-charge time, points, fine, impound, suspension and bail; totals with the 25/35/35-day caps; copy buttons.
- Shareable links (`/arrest-calculation/?c=a135-1-1&pv=1`) in the same format as the original panel.
- Turkish interface only; light and dark theme.
- Bail comes from the GTA World Türkiye bail sheet (`data/bail.json`, LEO tab, *Tam Kefalet Tutarı* column):
  - Arrested before → **KEFALETE UYGUN DEĞİL**
  - Any charge with *OTOMATİK KEFALET YOK* → **KEFALETE UYGUN DEĞİL**
  - Otherwise the **highest** full bail amount among the charges applies (amounts are never added up).

## What changed compared to MDC Panel+

| Original | Here |
|---|---|
| Calculation ran on the server (`POST /api/arrest-calculator`) | Same code runs in the browser (`src/lib/arrest-calculator.ts`) |
| Penal code fetched from the booskit CDN or `/api/gtaw-data` | Bundled JSON in `data/gtaw-data/`, served as a static file |
| English, Spanish and Slovenian | Turkish only |
| Bail from the penal code data | Bail from the Turkish bail sheet, plus the prior-arrest question |
| "Calculate" opened the Arrest Report | "Calculate" opens the shareable results page |

## Deploy to GitHub Pages

1. Create a new GitHub repository and push this folder to its `main` branch.
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The *Deploy to GitHub Pages* workflow runs on every push. When it finishes, the site is live at
   `https://<user>.github.io/<repo>/`.

The workflow sets the sub-path (`/<repo>`) automatically.

## Run locally

```sh
npm install
npm run dev          # http://localhost:9002
npm run build        # static site in ./out
```

## Updating the penal code

Replace `data/gtaw-data/gtaw_penal_code.json` (and `gtaw_depa_categories.json` if needed), then push.
Limits such as `MAX_SENTENCE_DAYS` are in `data/config.json`, and multipliers are in `data/additions.json`.

## License

GPL-3.0, same as the original project. See `LICENSE`.
