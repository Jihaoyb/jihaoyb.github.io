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
      <h2 class="heading-animate">Notes, experiments &amp; deep-dives</h2>
    </div>
    <span>{{ site.learning | size }} {% if site.learning.size == 1 %}post{% else %}posts{% endif %}</span>
  </div>
  <p class="lab-intro">Things I'm learning, building, and figuring out — written up so they stay useful to me later, and to anyone else who lands here.</p>
  <div class="lab-grid">
    {% assign posts = site.learning | sort: "date" | reverse %}
    {% for post in posts %}
      <a class="lab-card card-animate" href="{{ post.url }}">
        <div class="lab-card__meta">
          <span>{{ post.date | date: "%b %-d, %Y" }}</span>
          {% if post.minutes %}<span aria-hidden="true">·</span><span>{{ post.minutes }} min</span>{% endif %}
        </div>
        <h3 class="lab-card__title">{{ post.title }}</h3>
        <p class="lab-card__excerpt">{{ post.excerpt }}</p>
        {% if post.tags %}<ul class="lab-tags">{% for tag in post.tags %}<li class="lab-tag">{{ tag }}</li>{% endfor %}</ul>{% endif %}
        <span class="lab-card__more">Read →</span>
      </a>
    {% endfor %}
  </div>
</section>
