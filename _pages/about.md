---
permalink: /
title: "Jihao Ye Portfolio"
layout: home
author_profile: false
redirect_from:
  - /about/
  - /about.html
---

{% assign projects = site.projects | where: "featured", true | sort: "startD" | reverse %}
{% assign roles = site.working | sort: "startD" | reverse %}

<section class="hero portfolio-section" id="top">
  <div>
    <p class="eyebrow">Portfolio 2026</p>
    <!-- Animate static hero name text for a clean per-letter reveal. -->
    <h1 class="hero__title heading-animate">Jihao Ye</h1>
    <p class="hero__subtitle">
      Software engineer and product builder focused on scalable systems, applied AI,
      and clean interfaces that help teams move faster with confidence.
    </p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="#projects">View projects</a>
      <!-- Keep both CTAs visually consistent. -->
      <a class="btn btn--primary" href="{{ base_path }}/files/Jihao_Ye_Resume.pdf">Download resume</a>
    </div>
    <div class="hero__meta">
      <span>Based in Los Angeles, CA</span>
      <span>Open to full-time roles</span>
      <span>CS at University of Houston</span>
    </div>
  </div>
  <div class="hero__visual">
    <!-- Use one animation hook for all card-like elements. -->
    <div class="hero__portrait card-animate">
      <img src="{{ base_path }}/images/jihao-photo.jpg" alt="Jihao Ye portrait" width="800" height="800" decoding="async" fetchpriority="high">
    </div>
    <div class="hero__stats card-animate">
      <div class="hero__stat">
        <span>Experience</span>
        <strong>3 years</strong>
      </div>
      <div class="hero__stat">
        <span>Focus</span>
        <strong>AI systems</strong>
      </div>
      <div class="hero__stat">
        <span>Degree</span>
        <strong>BS CS 2025</strong>
      </div>
    </div>
  </div>
</section>

<section class="portfolio-section" id="about">
  <div class="section-title">
    <!-- Apply the heading animation class to section titles. -->
    <h2 class="heading-animate">Design-led engineering, built for impact.</h2>
    <span>About</span>
  </div>
  <div class="about-grid">
    <div class="about-card card-animate">
      <h3>Bio</h3>
      <p>
        I build products that bridge engineering rigor and user-first clarity. My recent work
        spans personalization systems, cloud-native apps, and automation pipelines that cut
        operational time while increasing trust in data.
      </p>
    </div>
    <div class="about-card card-animate">
      <h3>Focus areas</h3>
      <ul>
        <li>Backend systems and API design</li>
        <li>ML-driven personalization and automation</li>
        <li>Infrastructure that scales cleanly</li>
        <li>UX-minded product engineering</li>
      </ul>
    </div>
  </div>
  <div class="portfolio-highlight">
    <div class="portfolio-highlight__grid">
      <div class="portfolio-highlight__item">
        <h3>Product velocity</h3>
        <p>Delivering prototypes fast, then hardening them into reliable systems.</p>
      </div>
      <div class="portfolio-highlight__item">
        <h3>Data trust</h3>
        <p>Verifiable pipelines that make decisions auditable and easy to explain.</p>
      </div>
      <div class="portfolio-highlight__item">
        <h3>Collaboration</h3>
        <p>Cross-functional work with designers, founders, and engineers.</p>
      </div>
    </div>
  </div>
  <div class="portfolio-marquee">
    <div class="portfolio-marquee__track">
      <span>Product Engineering</span>
      <span>Applied AI</span>
      <span>System Design</span>
      <span>Cloud Infrastructure</span>
      <span>UX Collaboration</span>
      <span>Performance Optimization</span>
      <span>Product Engineering</span>
      <span>Applied AI</span>
      <span>System Design</span>
      <span>Cloud Infrastructure</span>
      <span>UX Collaboration</span>
      <span>Performance Optimization</span>
    </div>
  </div>
</section>

<section class="portfolio-section journey" id="journey">
  <div class="section-title">
    <!-- Apply the same heading animation for consistency. -->
    <h2 class="heading-animate">Journey</h2>
    <span>Timeline</span>
  </div>
  <div class="journey__content">
    <div>
      <p class="journey__intro">
        A quick visual throughline of how I move from idea to shipped product,
        emphasizing clarity, collaboration, and measurable outcomes.
      </p>
      <div class="journey__milestones">
        <div>
          <h3>Discover</h3>
          <p>Align on goals, constraints, and success metrics.</p>
        </div>
        <div>
          <h3>Design</h3>
          <p>Prototype flows that balance feasibility with experience.</p>
        </div>
        <div>
          <h3>Build</h3>
          <p>Ship resilient systems with scalable architecture.</p>
        </div>
        <div>
          <h3>Launch</h3>
          <p>Monitor, iterate, and optimize for impact.</p>
        </div>
      </div>
    </div>
    <!-- Inline SVG so scroll animation stays self-contained. -->
    <svg class="journey__line" viewBox="0 0 520 640" aria-hidden="true">
      <path
        class="journey__path"
        d="M40 20 C120 100, 200 80, 280 140 C340 190, 300 280, 220 320 C140 360, 120 460, 200 520 C280 580, 380 560, 480 620"
      />
    </svg>
  </div>
</section>

<section class="portfolio-section portfolio-section--tight" id="projects">
  <div class="section-title">
    <!-- Apply heading animation to section titles. -->
    <h2 class="heading-animate">Projects</h2>
    <a class="section-link" href="/projects/">Features<span class="section-link__arrow" aria-hidden="true">→</span></a>
  </div>
  <div class="project-folder-grid">
    {% for project in projects limit: 3 %}
      {% include portfolio/folder.html folder=project %}
    {% endfor %}
  </div>
</section>

<section class="portfolio-section" id="experience">
  <div class="section-title">
    <!-- Apply heading animation to section titles. -->
    <h2 class="heading-animate">Experience</h2>
    <span>{{ roles | size }} roles</span>
  </div>
  <div class="experience-grid" data-experience-accordion>
    {% for role in roles %}
    <article class="experience-card card-animate" data-experience-card>
      <button class="experience-card__header" type="button" aria-expanded="false">
        <div>
          <h3 class="experience-card__title">{{ role.position }} · {{ role.company }}</h3>
          <span class="experience-card__meta">{{ role.startD | date: "%b %Y" }} - {{ role.endD | default: "Present" }}</span>
        </div>
        <span class="experience-card__toggle">Details</span>
      </button>
      <div class="experience-card__details" aria-hidden="true">
        <div class="experience-card__summary">
          {{ role.content | markdownify }}
        </div>
        <p class="experience-card__meta">{{ role.location }}</p>
      </div>
    </article>
    {% endfor %}
  </div>
</section>

<section class="portfolio-section" id="capabilities">
  <div class="section-title">
    <!-- Apply heading animation to section titles. -->
    <h2 class="heading-animate">Capabilities</h2>
    <span>Toolbox</span>
  </div>
  <div class="capabilities-grid">
    <div class="capability card-animate">
      <h3>AI and data systems</h3>
      <p>LLM pipelines, vector search, recommendation engines, and analytics workflows.</p>
    </div>
    <div class="capability card-animate">
      <h3>Full-stack product build</h3>
      <p>React, Node, and cloud-native stacks that turn ideas into working software.</p>
    </div>
    <div class="capability card-animate">
      <h3>Cloud infrastructure</h3>
      <p>AWS, serverless deployments, and automated CI that keeps teams moving.</p>
    </div>
    <div class="capability card-animate">
      <h3>Design collaboration</h3>
      <p>Wireframes to production UI with accessibility and performance in mind.</p>
    </div>
  </div>
</section>

<section class="portfolio-section personal-section" id="personal">
  <div class="section-title">
    <h2 class="heading-animate">Personal</h2>
    <a class="section-link" href="/personal/">Beyond work<span class="section-link__arrow" aria-hidden="true">→</span></a>
  </div>
  <div class="personal-section__inner">
    <div>
      <p class="personal-section__copy">
        A glimpse into the hobbies and personal explorations that keep my creativity sharp
        and my energy grounded.
      </p>
      <div class="personal-section__tags">
        <span>Street photography</span>
        <span>Basketball</span>
        <span>Cooking</span>
        <span>Building side projects</span>
      </div>
    </div>
    <div class="personal-section__panel forcefield-wrap">
      <!-- Configure the particle field with image and density controls. -->
      <canvas class="forcefield-canvas" data-image="{{ base_path }}/images/background.webp" data-spacing="8" data-size="2" data-threshold="8" aria-hidden="true"></canvas>
      <div class="personal-section__panel-content forcefield-content">
        <h3>Snapshots & stories</h3>
        <p>Photo walks, new recipes, and experiments that recharge the mind.</p>
      </div>
    </div>
  </div>
</section>

<section class="portfolio-section portfolio-section--tight" id="lab">
  <div class="section-title">
    <h2 class="heading-animate">Lab</h2>
    <a class="section-link" href="/lab/">Posts<span class="section-link__arrow" aria-hidden="true">→</span></a>
  </div>
  <div class="lab-grid">
    {% assign lab_posts = site.learning | sort: "date" | reverse %}
    {% for post in lab_posts limit: 3 %}
      {% include portfolio/lab-card.html post=post %}
    {% endfor %}
  </div>
</section>
