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
| English GTA:W penal code | GTA World Türkiye *San Andreas Ceza Kanunu* |
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

## Penal code data

`data/gtaw-data/gtaw_penal_code.json` is generated from the GTA World Türkiye
*San Andreas Ceza Kanunu* by `scripts/build-penal-code.py`, which holds every article's
values copied from the law text. To change an article, edit that script and run:

```sh
python3 scripts/build-penal-code.py
```

- Articles 001–714 in numeric order. Articles whose sub-clauses carry different penalties are
  separate charges (e.g. `112a`, `112b`, `112c`; value tiers such as `123a`–`123e`).
- Where the law gives only a lower or only an upper limit, min and max are both set to that value.
- Drug tables (131, 601–606) use the category's amount; fines there are the legal maximum.
- 430/431: jail time, points and fines depend on the offence count (3rd count = C (2) felony).
- *Suçun Tarafı* multipliers follow Başlık VIII (`data/additions.json`), applied to each charge on its own:

  | | Süre | Suç puanı |
  |---|---|---|
  | Suçlu / 801. Suç Ortağı / 803. Nefret Suçu | 100% | 100% |
  | 802. Suça Yardım Etme | 50% | 100% |
  | 804. Suça Teşebbüs | 50% | 50% |
  | 805. Suç İçin Anlaşma | 75% | 75% |
  | 806. Suça Teşvik | 75% | 100% |

  Fractional points are rounded per charge and never go below 1 (807).
- *Şartlı Tahliye İhlali* keeps the MDC Panel+ default: time x1, points x2.
- The total sentence (min and max) is capped at `MAX_SENTENCE_MINUTES` = 28800 minutes (20 days) (`data/config.json`).
- *Mevcut Suç Puanı* (0–30) is entered on the calculator; the result shows *Yeni Suç Puanı* = current + charges and warns above `MAX_CRIMINAL_POINTS` (30).

## License

GPL-3.0, same as the original project. See `LICENSE`.
