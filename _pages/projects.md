---
permalink: /projects/
title: "Projects"
layout: home
author_profile: false
---

<section class="portfolio-section projects-index" id="all-projects">
  <div class="section-title">
    <div>
      <p class="eyebrow">Projects</p>
      <h2 class="heading-animate">The full shelf</h2>
    </div>
    <span>{{ site.projects | size }} total</span>
  </div>
  <p class="section-intro">Every build — the featured work from the homepage plus the earlier experiments. Click a folder to open it.</p>
  <div class="project-folder-grid">
    {% assign all_projects = site.projects | sort: "startD" | reverse %}
    {% for project in all_projects %}
      {% include portfolio/folder.html folder=project %}
    {% endfor %}
  </div>
</section>
