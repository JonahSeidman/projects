# My Projects — Photo Portfolio

A zero-config photo gallery for showing off your projects. No frameworks, no build
dependencies — just drop in photos and go.

## Add or change photos (the only thing you'll do regularly)

1. Drop image files into the `images/` folder (`.jpg`, `.png`, `.webp`, `.gif`, `.svg`).
2. Run `npm run build`.

That's it. Photo titles are generated from filenames
(`my-cool-app.jpg` → "My Cool App"). Files are shown in alphabetical order, so
prefix with numbers (`01-`, `02-`) to control ordering.

The three `*-project.svg` files and `images/captions.json` are placeholders —
delete them once you add real photos.

### Optional: custom titles & descriptions

Edit `images/captions.json`:

```json
{
  "my-photo.jpg": { "title": "Cool Thing", "description": "What it is." }
}
```

### Optional: change the site name

Edit `site.json` (`title` and `subtitle`), then `npm run build`.

## Preview locally

```bash
npm start
```

Then open http://localhost:3000.

## Make it live on the internet

This site is plain static files, so any static host works. The easiest:

### GitHub Pages (free, automated)

1. Create a repo on GitHub and push this folder to it.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` auto-builds and deploys (see `.github/workflows/deploy.yml`).

### Or any drag-and-drop host

Run `npm run build`, then drag this whole folder onto
[Netlify Drop](https://app.netlify.com/drop) or
[Cloudflare Pages](https://pages.cloudflare.com/). It's live in seconds — no
build settings needed.
