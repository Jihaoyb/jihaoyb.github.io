---
permalink: /lab/
title: "Lab"
layout: home
author_profile: false
---

<section class="portfolio-section lab-index" id="lab">
  <div class="section-title">
    <div>
      <p class="eyebrow">Lab</p>
      <h1 class="heading-animate">Notes, experiments &amp; deep-dives</h1>
    </div>
    <span>{{ site.learning | size }} {% if site.learning.size == 1 %}post{% else %}posts{% endif %}</span>
  </div>
  <p class="lab-intro">Things I'm learning, building, and figuring out — written up so they stay useful to me later, and to anyone else who lands here.</p>
  <div class="lab-grid">
    {% assign posts = site.learning | sort: "date" | reverse %}
    {% for post in posts %}
      {% include portfolio/lab-card.html post=post %}
    {% endfor %}
  </div>
</section>
