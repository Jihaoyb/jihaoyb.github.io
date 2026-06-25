/* Reveal logic is isolated so it can be updated without touching markup. */
(function () {
  if (typeof window === "undefined") {
    return;
  }

  const cards = Array.from(document.querySelectorAll(".card-animate"));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (prefersReducedMotion.matches) {
    cards.forEach((card) => {
      card.classList.add("is-visible");
    });
  } else {
    cards.forEach((card, index) => {
      card.style.setProperty("--card-delay", `${index * 50}ms`);
    });

    const revealCard = (card) => {
      if (!card.classList.contains("is-visible")) {
        card.classList.add("is-visible");
      }
    };

    if (!("IntersectionObserver" in window)) {
      cards.forEach(revealCard);
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }
            revealCard(entry.target);
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.2,
          rootMargin: "0px 0px -10% 0px",
        }
      );

      cards.forEach((card) => observer.observe(card));
    }
  }

  const headingTargets = Array.from(document.querySelectorAll(".heading-animate"));
  if (headingTargets.length) {
    headingTargets.forEach((heading) => {
      if (heading.dataset.animated === "true") {
        return;
      }
      const text = heading.textContent || "";
      const chars = Array.from(text);
      heading.setAttribute("aria-label", text.trim());
      heading.textContent = "";
      chars.forEach((char, index) => {
        const span = document.createElement("span");
        span.className = "char";
        span.setAttribute("aria-hidden", "true");
        span.textContent = char === " " ? "\u00a0" : char;
        span.style.setProperty("--char-delay", `${index * 35}ms`);
        heading.appendChild(span);
      });
      heading.dataset.animated = "true";
    });

    const revealHeading = (heading) => {
      if (heading.classList.contains("is-visible")) {
        return;
      }
      heading.classList.add("is-visible");
    };

    if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
      headingTargets.forEach(revealHeading);
    } else {
      const headingObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }
            revealHeading(entry.target);
            headingObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );
      headingTargets.forEach((heading) => headingObserver.observe(heading));
    }
  }

  const journeyPath = document.querySelector(".journey__path");
  if (journeyPath) {
    if (prefersReducedMotion.matches) {
      journeyPath.style.strokeDashoffset = 0;
    } else {
      const pathLength = journeyPath.getTotalLength();
      // Set the path length once to avoid repeated layout work on scroll.
      journeyPath.style.setProperty("--journey-length", pathLength.toString());

      const updateJourney = () => {
        const section = journeyPath.closest(".journey");
        if (!section) {
          return;
        }
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const total = rect.height + viewportHeight;
        const progress = Math.min(Math.max((viewportHeight - rect.top) / total, 0), 1);
        journeyPath.style.strokeDashoffset = (1 - progress) * pathLength;
      };

      let journeyFrame = 0;
      const onScroll = () => {
        if (journeyFrame) {
          return;
        }
        journeyFrame = window.requestAnimationFrame(() => {
          journeyFrame = 0;
          updateJourney();
        });
      };

      updateJourney();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
  }

  const canvases = Array.from(document.querySelectorAll(".forcefield-canvas"));
  const setupForceField = (canvas) => {
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    const getAccent = () => {
      const style = window.getComputedStyle(container);
      return style.getPropertyValue("--accent").trim() || "#e4572e";
    };

    const state = {
      width: 0,
      height: 0,
      particles: [],
      mouse: { x: 0, y: 0, active: false },
      imageData: null,
      imageUrl: canvas.dataset.image || "",
      accent: getAccent(),
      loading: false,
      frameId: 0,
      isVisible: false,
    };

    // Use fractional spacing to tune density without changing the render size.
    const spacing = Math.max(2, Number.parseFloat(canvas.dataset.spacing || "10"));
    const pointSize = Math.max(1, Number.parseInt(canvas.dataset.size || "2", 10));
    // Skip very dark pixels to preserve contrast in the particle field.
    const luminanceThreshold = Math.max(0, Math.min(255, Number.parseInt(canvas.dataset.threshold || "0", 10)));
    const forceStrength = Number.parseFloat(canvas.dataset.force || "2");
    const radius = Number.parseFloat(canvas.dataset.radius || "100");
    const friction = 0.86;
    const restore = 0.08;

    const buildParticles = () => {
      state.particles = [];
      for (let y = 0; y < state.height; y += spacing) {
        for (let x = 0; x < state.width; x += spacing) {
          let color = state.accent;
          if (state.imageData) {
            const sampleX = Math.min(state.width - 1, Math.max(0, Math.round(x)));
            const sampleY = Math.min(state.height - 1, Math.max(0, Math.round(y)));
            const idx = (sampleY * state.width + sampleX) * 4;
            const r = state.imageData.data[idx];
            const g = state.imageData.data[idx + 1];
            const b = state.imageData.data[idx + 2];
            const a = state.imageData.data[idx + 3];
            if (a < 20) {
              continue;
            }
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luminance < luminanceThreshold) {
              continue;
            }
            color = `rgba(${r}, ${g}, ${b}, 0.95)`;
          }
          state.particles.push({
            x,
            y,
            ox: x,
            oy: y,
            vx: 0,
            vy: 0,
            size: pointSize,
            color,
          });
        }
      }
    };

    const loadImageData = () => {
      if (!state.imageUrl || state.loading || !state.width || !state.height) {
        return;
      }
      state.loading = true;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const offscreen = document.createElement("canvas");
        offscreen.width = state.width;
        offscreen.height = state.height;
        const offContext = offscreen.getContext("2d");
        if (!offContext) {
          state.loading = false;
          return;
        }

        const scale = Math.max(state.width / img.width, state.height / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const dx = (state.width - drawWidth) / 2;
        const dy = (state.height - drawHeight) / 2;

        offContext.drawImage(img, dx, dy, drawWidth, drawHeight);
        try {
          state.imageData = offContext.getImageData(0, 0, state.width, state.height);
        } catch (error) {
          state.imageData = null;
        }
        state.loading = false;
        buildParticles();
      };
      img.onerror = () => {
        state.imageData = null;
        state.loading = false;
        buildParticles();
      };
      img.src = state.imageUrl;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      state.width = Math.max(1, Math.floor(rect.width));
      state.height = Math.max(1, Math.floor(rect.height));
      canvas.width = state.width * dpr;
      canvas.height = state.height * dpr;
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      // Scale the canvas for device pixel ratio to keep particles sharp.
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
      state.accent = getAccent();
      state.imageData = null;

      if (state.imageUrl && state.isVisible) {
        loadImageData();
      } else if (!state.imageUrl) {
        buildParticles();
      }
    };

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = event.clientX - rect.left;
      state.mouse.y = event.clientY - rect.top;
      state.mouse.active = true;
    };

    const onLeave = () => {
      state.mouse.active = false;
    };

    const draw = () => {
      state.frameId = 0;
      if (!state.isVisible || document.hidden) {
        return;
      }

      context.clearRect(0, 0, state.width, state.height);
      context.globalAlpha = 1;

      state.particles.forEach((p) => {
        if (state.mouse.active) {
          const dx = p.x - state.mouse.x;
          const dy = p.y - state.mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < radius) {
            const strength = (1 - distance / radius) * forceStrength;
            p.vx += (dx / (distance || 1)) * strength;
            p.vy += (dy / (distance || 1)) * strength;
          }
        }

        p.vx *= friction;
        p.vy *= friction;
        p.vx += (p.ox - p.x) * restore;
        p.vy += (p.oy - p.y) * restore;
        p.x += p.vx;
        p.y += p.vy;

        const px = Math.round(p.x - p.size / 2);
        const py = Math.round(p.y - p.size / 2);
        context.fillStyle = p.color;
        context.fillRect(px, py, p.size, p.size);
      });

      state.frameId = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!state.frameId && state.isVisible && !document.hidden) {
        state.frameId = window.requestAnimationFrame(draw);
      }
    };

    const stop = () => {
      if (state.frameId) {
        window.cancelAnimationFrame(state.frameId);
        state.frameId = 0;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          state.isVisible = entry.isIntersecting;
          if (state.isVisible) {
            if (state.imageUrl && !state.imageData) {
              loadImageData();
            }
            start();
          } else {
            stop();
          }
        },
        { rootMargin: "120px" }
      );
      visibilityObserver.observe(canvas);
    } else {
      state.isVisible = true;
      start();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
  };

  if (!prefersReducedMotion.matches) {
    canvases.forEach(setupForceField);
  }

  const hobbyTrack = document.querySelector("[data-hobby-track]");
  const hobbyPath = hobbyTrack?.querySelector(".hobby-track__path-fill");
  const hobbyDots = Array.from(document.querySelectorAll("[data-hobby-dot]"));
  const hobbySections = Array.from(document.querySelectorAll("[data-hobby-section]"));

  if (hobbyTrack && hobbyPath && hobbyDots.length && hobbySections.length) {
    let hobbyPathLength = 0;
    hobbyPathLength = hobbyPath.getTotalLength();
    hobbyTrack.style.setProperty("--hobby-line-length", hobbyPathLength);

    const updateHobbyTrackLayout = () => {
      const container = hobbyTrack.closest(".hobbies-section");
      const first = hobbySections[0];
      const last = hobbySections[hobbySections.length - 1];
      if (!container || !first || !last) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const topOffset = firstRect.top - containerRect.top;
      const height = Math.max(160, lastRect.bottom - firstRect.top);

      hobbyTrack.style.setProperty("--hobby-track-top", `${topOffset}px`);
      hobbyTrack.style.setProperty("--hobby-track-height", `${height}px`);
    };

    const updateHobbyProgress = () => {
      updateHobbyTrackLayout();
      const anchor = window.innerHeight * 0.5;

      hobbySections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;
        const progress = Math.min(Math.max((anchor - sectionTop) / rect.height, 0), 1);
        const dot = hobbyDots[index];
        if (!dot) {
          return;
        }
        dot.style.setProperty("--dot-progress", progress);
        dot.classList.toggle("is-active", progress > 0 && progress < 1);
        dot.classList.toggle("is-passed", progress >= 1);

        if (sectionBottom < anchor) {
          dot.style.setProperty("--dot-progress", 1);
        }
      });

      const total = Math.max(1, hobbySections.length - 1);
      const passedCount = hobbyDots.filter((dot) => dot.classList.contains("is-passed")).length;
      const lineProgress = passedCount / total;
      hobbyPath.style.strokeDashoffset = (1 - Math.min(1, lineProgress)) * hobbyPathLength;
    };

    let hobbyFrame = 0;
    const onScroll = () => {
      if (hobbyFrame) {
        return;
      }
      hobbyFrame = window.requestAnimationFrame(() => {
        hobbyFrame = 0;
        updateHobbyProgress();
      });
    };

    updateHobbyProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  const underlineTargets = Array.from(document.querySelectorAll(".underline-animate"));
  if (underlineTargets.length) {
    const revealUnderline = (target) => {
      if (!target.classList.contains("is-visible")) {
        target.classList.add("is-visible");
      }
    };

    if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
      underlineTargets.forEach(revealUnderline);
    } else {
      const underlineObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }
            revealUnderline(entry.target);
            underlineObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      underlineTargets.forEach((target) => underlineObserver.observe(target));
    }
  }

  const experienceCards = Array.from(document.querySelectorAll("[data-experience-card]"));
  if (experienceCards.length) {
    const closeAll = (except) => {
      experienceCards.forEach((card) => {
        if (card === except) {
          return;
        }
        card.classList.remove("is-open");
        const button = card.querySelector(".experience-card__header");
        const details = card.querySelector(".experience-card__details");
        if (button) {
          button.setAttribute("aria-expanded", "false");
        }
        if (details) {
          details.setAttribute("aria-hidden", "true");
        }
      });
    };

    experienceCards.forEach((card) => {
      const button = card.querySelector(".experience-card__header");
      const details = card.querySelector(".experience-card__details");
      if (!button || !details) {
        return;
      }

      button.addEventListener("click", () => {
        const isOpen = card.classList.contains("is-open");
        closeAll(card);
        card.classList.toggle("is-open", !isOpen);
        button.setAttribute("aria-expanded", isOpen ? "false" : "true");
        details.setAttribute("aria-hidden", isOpen ? "true" : "false");
      });
    });
  }

  const projectFolders = Array.from(document.querySelectorAll("[data-project-folder]"));
  if (projectFolders.length) {
    let lastScrollY = null;
    const header = document.querySelector(".portfolio-header");
    const headerOffset = header ? header.getBoundingClientRect().height + 16 : 16;

    projectFolders.forEach((folder) => {
      const button = folder.querySelector(".project-folder__header");
      const files = folder.querySelector(".project-folder__files");
      const shell = folder.querySelector(".project-folder__shell");
      if (!button || !files) {
        return;
      }

      button.addEventListener("click", () => {
        const isOpen = folder.classList.contains("is-open");
        folder.classList.toggle("is-open", !isOpen);
        button.setAttribute("aria-expanded", isOpen ? "false" : "true");
        files.setAttribute("aria-hidden", isOpen ? "true" : "false");

        const openFolders = projectFolders.filter((item) => item.classList.contains("is-open"));
        if (!isOpen) {
          if (lastScrollY === null) {
            lastScrollY = window.scrollY;
          }
          const rect = folder.getBoundingClientRect();
          const targetY = window.scrollY + rect.top - headerOffset;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        } else if (!openFolders.length && lastScrollY !== null) {
          window.scrollTo({ top: lastScrollY, behavior: "smooth" });
          lastScrollY = null;
        }
      });

      if (shell) {
        shell.addEventListener("mousemove", (event) => {
          if (!folder.classList.contains("is-open")) {
            return;
          }
          const rect = shell.getBoundingClientRect();
          const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.2;
          const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.2;
          folder.style.setProperty("--paper-x", `${dx}px`);
          folder.style.setProperty("--paper-y", `${dy}px`);
        });

        shell.addEventListener("mouseleave", () => {
          folder.style.setProperty("--paper-x", "0px");
          folder.style.setProperty("--paper-y", "0px");
        });
      }
    });
  }
})();
