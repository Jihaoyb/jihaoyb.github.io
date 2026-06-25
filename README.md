# Jihao Ye Portfolio

This repository powers [jihaoyb.github.io](https://jihaoyb.github.io). It is a static Jekyll site customized from Academic Pages with a bespoke portfolio layout and lightweight browser interactions.

## Local development

Requirements:

- Ruby 3.2 with Bundler
- Node.js 18 or newer

Install dependencies and start Jekyll:

```bash
bundle install
npm install
npm run build
bundle exec jekyll serve
```

The site is available at `http://localhost:4000`.

Docker can be used instead:

```bash
docker build -t jihaoy-portfolio .
docker run --rm -p 4000:4000 jihaoy-portfolio
```

## Structure

- `_pages/about.md`: Homepage content and section layout.
- `_pages/personal.md`: Personal hobbies page.
- `_layouts/home.html`: Custom layout wrapper for the portfolio pages.
- `_includes/portfolio/`: Custom header/footer partials.
- `_sass/_portfolio.scss`: Visual system and component styles.
- `assets/js/portfolio.js`: Scroll/animation behaviors (cards, headings, forcefield, hobby track).
- `_projects/`: Project entries rendered on the homepage.
- `_working/`: Experience entries rendered on the homepage.
- `images/`: Site images (portrait, backgrounds, gallery).
- `files/`: Resume and downloadable files.

## Notes

- Original template documentation lives in `TEMPLATE_README.md`.
- The site is static and deployed via GitHub Pages.
- Pull requests and pushes to `main` are checked by `.github/workflows/site-ci.yml`.
