---
permalink: /personal/
title: "Personal"
layout: home
author_profile: false
---

<section class="personal-hero forcefield-wrap">
  <!-- Configure the particle field with image and density controls. -->
  <canvas class="forcefield-canvas" data-image="{{ base_path }}/images/background.webp" data-spacing="8" data-size="2" data-threshold="8" aria-hidden="true"></canvas>
  <div class="personal-hero__inner forcefield-content">
    <div class="personal-hero__content">
      <p class="eyebrow">Personal</p>
      <h1 class="hero__title heading-animate">Life outside the build</h1>
      <p class="hero__subtitle">
        A quieter space for the hobbies, routines, and moments that keep me curious.
      </p>
    </div>
  </div>
</section>

<section class="portfolio-section hobbies-section" id="hobbies">
  <div class="section-title">
    <h2 class="heading-animate">Hobbies</h2>
    <span>Off the clock</span>
  </div>
  <div class="hobby-track" data-hobby-track>
    <svg class="hobby-track__svg" viewBox="0 0 80 520" aria-hidden="true">
      <path class="hobby-track__path" d="M40 20 C48 120, 32 220, 40 320 C48 420, 32 480, 40 500" />
      <path class="hobby-track__path-fill" d="M40 20 C48 120, 32 220, 40 320 C48 420, 32 480, 40 500" />
    </svg>
    <div class="hobby-track__dots" role="navigation" aria-label="Hobby navigation">
      <a class="hobby-dot" data-hobby-dot href="#hobby-photography" aria-label="Street photography">
        <span class="hobby-dot__fill" aria-hidden="true"></span>
      </a>
      <a class="hobby-dot" data-hobby-dot href="#hobby-basketball" aria-label="Basketball">
        <span class="hobby-dot__fill" aria-hidden="true"></span>
      </a>
      <a class="hobby-dot" data-hobby-dot href="#hobby-cooking" aria-label="Cooking">
        <span class="hobby-dot__fill" aria-hidden="true"></span>
      </a>
      <a class="hobby-dot" data-hobby-dot href="#hobby-side-projects" aria-label="Side experiments">
        <span class="hobby-dot__fill" aria-hidden="true"></span>
      </a>
    </div>
  </div>
  <div class="hobby-sections">
    <article class="hobby-section card-animate" id="hobby-photography" data-hobby-section>
      <h3 class="underline-animate">Street photography</h3>
      <p>Exploring neighborhoods and street scenes through film and digital stories.</p>
    </article>
    <article class="hobby-section card-animate" id="hobby-basketball" data-hobby-section>
      <h3 class="underline-animate">Basketball</h3>
      <p>Weekly pickup games to reset and stay competitive.</p>
    </article>
    <article class="hobby-section card-animate" id="hobby-cooking" data-hobby-section>
      <h3 class="underline-animate">Cooking</h3>
      <p>Experimenting with ramen broths and weekend comfort food.</p>
    </article>
    <article class="hobby-section card-animate" id="hobby-side-projects" data-hobby-section>
      <h3 class="underline-animate">Side experiments</h3>
      <p>Rapid prototypes for small tools and personal workflows.</p>
    </article>
  </div>
</section>
