---
title: "How This Portfolio Is Built: Markdown In, Website Out"
excerpt: "A tour of the Jekyll pipeline behind this site — how a handful of plain-text files become the pages you're reading."
date: 2026-06-30
minutes: 5
tags: [Jekyll, Static Sites, Liquid]
terms: [jekyll, static-site-generator, front-matter, yaml, liquid, markdown, github-pages]
published: true
---

When people look at this site, they often assume there's a heavy framework
behind it. There isn't. The whole thing is plain text files run through a tool
called {% include term.html id="jekyll" %}, a {% include term.html id="static-site-generator" text="static site generator" %}. Once that clicks, the site stops
feeling like magic and starts feeling like Lego. Here's the mental model.

## A page is three languages in one file

Open the homepage source and you'll find three different things living in one
`.md` file:

```markdown
---
permalink: /              # 1. YAML "front matter": settings + variables
layout: home
---

{% raw %}{% assign projects = site.projects | where: "featured", true %}  {# 2. Liquid: logic #}
{% for project in projects limit: 3 %}
  {% include portfolio/folder.html folder=project %}
{% endfor %}{% endraw %}

## A normal heading        <!-- 3. Markdown: the actual content -->
```

- {% include term.html id="front-matter" text="Front matter" %} (between the `---` lines) is {% include term.html id="yaml" text="YAML" %} — metadata and variables
  for that file.
- {% include term.html id="liquid" %} (`{% raw %}{% %}{% endraw %}` for logic, `{% raw %}{{ }}{% endraw %}` to print a value) is the
  templating language that loops, filters, and pulls in other files.
- {% include term.html id="markdown" %} / HTML is the content you actually write, which a converter
  turns into HTML.

So Markdown is just the easy way to write the *body*. The front matter and
Liquid are what make it a Jekyll source file rather than a plain document.

## Content vs. templates

The single most useful distinction:

- **`.md` and collection files are your content and data** — the *what*.
- **Files in `_layouts/` and `_includes/` are the templates** — the *how it
  looks*.

The clearest example on this site is the project folder. There is exactly one
template, `_includes/portfolio/folder.html`, and it gets rendered once per
project. Each project is a separate file in `_projects/` that carries only
*data* — a title, an excerpt, a tech list, some bullet points. Drop a new file
in that folder and a new styled folder appears on the page automatically. You
never copy HTML around; you add a record and the template does the rest.

## How a page is assembled

A content file doesn't become a page on its own — it gets *nested* inside
layouts:

<figure class="lab-figure">
<svg viewBox="0 0 700 400" role="img" aria-label="Diagram: data files and templates feed the page content, which the site chrome wraps, and Jekyll builds the result into plain HTML served by GitHub Pages." xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M1 1L9 5L1 9" style="fill:none;stroke:var(--muted);stroke-width:1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="40" y="18" width="280" height="60" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
  <text x="180" y="43" text-anchor="middle" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;fill:var(--ink)">_projects/*.md</text>
  <text x="180" y="63" text-anchor="middle" style="font-size:12px;fill:var(--muted)">data — one file per project</text>
  <rect x="380" y="18" width="280" height="60" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
  <text x="520" y="43" text-anchor="middle" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;fill:var(--ink)">folder.html</text>
  <text x="520" y="63" text-anchor="middle" style="font-size:12px;fill:var(--muted)">template — rendered once per project</text>
  <path d="M180 78 L330 116" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#arr)"/>
  <path d="M520 78 L370 116" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#arr)"/>
  <rect x="140" y="122" width="420" height="60" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
  <text x="350" y="147" text-anchor="middle" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;fill:var(--ink)">_pages/about.md</text>
  <text x="350" y="167" text-anchor="middle" style="font-size:12px;fill:var(--muted)">the page's inner content — runs the loop above</text>
  <path d="M350 182 L350 218" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#arr)"/>
  <text x="362" y="205" style="font-size:12px;fill:var(--muted)">wrapped by</text>
  <rect x="140" y="224" width="420" height="60" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
  <text x="350" y="249" text-anchor="middle" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;fill:var(--ink)">home.html</text>
  <text x="350" y="269" text-anchor="middle" style="font-size:12px;fill:var(--muted)">site chrome: head, header, footer, scripts</text>
  <path d="M350 284 L350 320" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#arr)"/>
  <text x="362" y="307" style="font-size:12px;fill:var(--muted)">jekyll build</text>
  <rect x="140" y="326" width="420" height="60" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.5"/>
  <text x="350" y="351" text-anchor="middle" style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;fill:var(--ink)">_site/index.html</text>
  <text x="350" y="371" text-anchor="middle" style="font-size:12px;fill:var(--muted)">plain HTML — served as-is by GitHub Pages</text>
</svg>
<figcaption>The assembly chain: data through template into content, content into chrome, chrome into plain HTML.</figcaption>
</figure>

The file you edit most only contains the *inner content* of the page. It never
repeats the `<html>`, `<head>`, header, or footer — those live once in the
layout and are reused on every page. That reuse is the entire point of a static
site generator. (This very post is proof: it's a Markdown file in `_learning/`,
rendered by a `learning-post` template that chains straight into the same site
chrome.)

## The build, and where it goes

When you push to `main`, {% include term.html id="github-pages" %} runs Jekyll for you. Jekyll merges the
content through the templates, converts the Markdown to HTML, and writes the
finished files into a `_site/` folder. **That generated folder is what visitors
actually download** — your `.md` files never reach the browser.

One rule follows from this: never hand-edit `_site/`. It's overwritten on every
build. You change the *source*, push, and let the build regenerate everything.

## Why this is a nice way to work

Because content and presentation are separated, the everyday tasks are tiny:

- **Add a project?** Drop a Markdown file in `_projects/`.
- **Add a post like this one?** Drop a Markdown file in `_learning/`.
- **Restyle every card?** Edit one template.
- **Change the header everywhere?** Edit one include.

Small inputs, consistent output. That's the whole trick — and it's why a
"website" here is really just a well-organized folder of text.
