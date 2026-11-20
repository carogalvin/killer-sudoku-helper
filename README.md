# Killer Sudoku Solver

A helper for working through killer sudoku puzzles. Enter a cage's target sum and
cell count, see every valid number combination, and eliminate combinations as you
rule them out.

In **Look up**, the sum can be a simple formula using `+` and `-`, such as
`45-14-10-5`. The app shows the result and the combinations for it.

Each tracked cage card shows the digits that **must be in the cage**, shared by
every remaining possibility. These update as you eliminate or restore
combinations. If no possibilities remain, the card reports that instead.

Use **Split cage** to enter a subsection's cell count and sum; the other
subsection is calculated automatically. Both appear on the same card, and each
can be split again. Possibilities respect the original cage's distinct-digit
rule and all eliminations across its subsections. Expand **Eliminated** to
restore a subsection's combinations, or use **Undo split** to remove a split
and its descendants. Splits are saved with your cages.

Runs entirely in the browser — no backend, no account, no network calls.

## Live app

Deployed to GitHub Pages: **https://carogalvin.github.io/killer-sudoku-helper/**

On mobile, use your browser's **Add to Home Screen** to launch it fullscreen like
a native app.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint
npm test         # split and combination tests (Node 24+)
```

## Deploying

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages.

One-time setup: in **Settings → Pages**, set **Source** to **GitHub Actions**.

The Pages base path is set in `vite.config.ts`. It only applies in CI, so local dev
still serves from `/`. If the repo is ever renamed, update the `base` value there.

## Data storage

Tracked cages are saved to `localStorage` under the `killer-sudoku:` prefix, so
they persist across reloads but stay on the device you created them on. Clearing
site data clears your cages.

## Project history

This started as a GitHub Spark app. It has since been migrated off Spark — the
`useKV` hook was replaced with a `localStorage`-backed equivalent in
`src/hooks/use-kv.ts`, and the Spark Vite plugins and runtime were removed. The
app is now a plain React + Vite + Tailwind project.

## License

MIT — see [LICENSE](LICENSE).
