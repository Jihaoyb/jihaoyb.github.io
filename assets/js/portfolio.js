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
      heading.setAttribute("aria-label", text.trim());
      heading.textContent = "";
      // Wrap each word so its letters never wrap apart; keep real spaces
      // between words so the line still breaks between words, not mid-word.
      let charIndex = 0;
      text.split(/(\s+)/).forEach((token) => {
        if (token === "") {
          return;
        }
        if (/^\s+$/.test(token)) {
          heading.appendChild(document.createTextNode(" "));
          return;
        }
        const word = document.createElement("span");
        word.className = "word";
        word.setAttribute("aria-hidden", "true");
        Array.from(token).forEach((char) => {
          const span = document.createElement("span");
          span.className = "char";
          span.textContent = char;
          span.style.setProperty("--char-delay", `${charIndex * 35}ms`);
          word.appendChild(span);
          charIndex += 1;
        });
        heading.appendChild(word);
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
    const reduceMotion = prefersReducedMotion.matches;

    // Split a file's content into per-word spans (once) so the content can
    // reveal word by word after the file has flown into place.
    const splitWords = (file) => {
      if (file.dataset.split === "true") {
        return;
      }
      const walker = document.createTreeWalker(file, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.trim()) {
          textNodes.push(node);
        }
      }
      textNodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        textNode.nodeValue.split(/(\s+)/).forEach((part) => {
          if (part === "") {
            return;
          }
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
            return;
          }
          const span = document.createElement("span");
          span.className = "reveal-word";
          span.textContent = part;
          fragment.appendChild(span);
        });
        textNode.parentNode.replaceChild(fragment, textNode);
      });
      Array.from(file.querySelectorAll(".reveal-word")).forEach((word, index) => {
        word.style.setProperty("--w-delay", `${index * 8}ms`);
      });
      file.dataset.split = "true";
    };

    projectFolders.forEach((folder) => {
      const button = folder.querySelector(".project-folder__header");
      const files = folder.querySelector(".project-folder__files");
      if (!button || !files) {
        return;
      }
      const fileEls = Array.from(folder.querySelectorAll(".project-folder__file"));
      let revealTimers = [];

      button.addEventListener("click", () => {
        const isOpen = folder.classList.contains("is-open");

        // FLIP step 1 (First): record every folder shell's position before the
        // grid reflows (opening a folder makes it span the whole row).
        const shells = projectFolders.map((item) =>
          item.querySelector(".project-folder__shell")
        );
        const firstRects = reduceMotion
          ? null
          : shells.map((shell) => shell.getBoundingClientRect());

        folder.classList.toggle("is-open", !isOpen);
        button.setAttribute("aria-expanded", isOpen ? "false" : "true");
        files.setAttribute("aria-hidden", isOpen ? "true" : "false");

        // FLIP steps 2-4 (Last/Invert/Play): jump each shell back to its old
        // spot, then transition to the new layout so the opened folder glides
        // to center and the others slide up/down instead of teleporting.
        if (firstRects) {
          const deltas = shells.map((shell, i) => {
            const last = shell.getBoundingClientRect();
            return {
              dx: firstRects[i].left - last.left,
              dy: firstRects[i].top - last.top,
            };
          });
          shells.forEach((shell, i) => {
            const { dx, dy } = deltas[i];
            if (!dx && !dy) {
              return;
            }
            shell.style.transition = "none";
            shell.style.transform = `translate(${dx}px, ${dy}px)`;
          });
          // Force a reflow so the browser commits the inverted positions; then
          // playing the transition animates from there instead of snapping
          // straight to the final layout (which looked like a flash).
          void document.body.offsetWidth;
          shells.forEach((shell, i) => {
            const { dx, dy } = deltas[i];
            if (!dx && !dy) {
              return;
            }
            shell.style.transition =
              "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)";
            shell.style.transform = "";
            const done = () => {
              shell.style.transition = "";
              shell.removeEventListener("transitionend", done);
            };
            shell.addEventListener("transitionend", done);
          });
        }

        revealTimers.forEach((timer) => window.clearTimeout(timer));
        revealTimers = [];
        if (!isOpen) {
          // Opening: split each file's content, then start its word-by-word
          // reveal the moment that file lands in the column — so each card's
          // text appears as it arrives, not after all three have settled.
          // FILE_STAGGER / FLY_DURATION mirror the CSS fly-in transition on
          // .project-folder__file; keep the two in sync.
          const FILE_STAGGER = reduceMotion ? 0 : 150;
          const FLY_DURATION = reduceMotion ? 0 : 500;
          fileEls.forEach(splitWords);
          fileEls.forEach((file, i) => {
            const startDelay = i * FILE_STAGGER;
            file.style.transitionDelay = reduceMotion ? "" : `${startDelay}ms`;
            const revealAt = reduceMotion
              ? 0
              : Math.max(0, startDelay + FLY_DURATION - 70);
            revealTimers.push(
              window.setTimeout(
                () => file.classList.add("is-revealed"),
                revealAt
              )
            );
          });
        } else {
          // Closing: hide the content so it re-reveals on the next open, and
          // clear the per-file stagger so the cards retract together.
          fileEls.forEach((file) => {
            file.classList.remove("is-revealed");
            file.style.transitionDelay = "";
          });
        }

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
    });
  }

  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    // Cycle through system -> light -> dark. "system" clears the override so
    // the CSS color-scheme follows the OS; the head script handles first paint.
    const order = ["system", "light", "dark"];
    const labels = {
      system: "Theme: system (switch to light)",
      light: "Theme: light (switch to dark)",
      dark: "Theme: dark (switch to system)",
    };

    const readStored = () => {
      try {
        return localStorage.getItem("theme");
      } catch (error) {
        return null;
      }
    };

    const applyTheme = (mode) => {
      if (mode === "light" || mode === "dark") {
        document.documentElement.setAttribute("data-theme", mode);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      const label = labels[mode] || labels.system;
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("title", label);
    };

    let current = readStored();
    if (current !== "light" && current !== "dark") {
      current = "system";
    }
    applyTheme(current);

    themeToggle.addEventListener("click", () => {
      current = order[(order.indexOf(current) + 1) % order.length];
      try {
        if (current === "system") {
          localStorage.removeItem("theme");
        } else {
          localStorage.setItem("theme", current);
        }
      } catch (error) {
        /* Ignore storage failures (private mode, disabled cookies, etc.). */
      }
      applyTheme(current);
    });
  }

  // Comments (giscus) on Lab posts: inject the widget only when its section
  // nears the viewport, themed to match the site, and keep it in sync when
  // the theme toggle or the OS scheme changes.
  const commentsMount = document.querySelector("[data-giscus]");
  if (commentsMount) {
    const giscusTheme = () => {
      const forced = document.documentElement.getAttribute("data-theme");
      const dark =
        forced === "dark" ||
        (!forced && window.matchMedia("(prefers-color-scheme: dark)").matches);
      return dark ? "noborder_dark" : "noborder_light";
    };

    const syncGiscusTheme = () => {
      const theme = giscusTheme();
      // If the toggle fires while client.js is still loading (no iframe yet),
      // update the pending script tag — giscus reads its attributes when it
      // runs, so the widget still boots in the right theme.
      const pending = commentsMount.querySelector("script[data-theme]");
      if (pending) {
        pending.setAttribute("data-theme", theme);
      }
      const frame = document.querySelector("iframe.giscus-frame");
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(
          { giscus: { setConfig: { theme: theme } } },
          "https://giscus.app"
        );
      }
    };

    const injectGiscus = () => {
      if (commentsMount.dataset.loaded === "true") {
        return;
      }
      commentsMount.dataset.loaded = "true";
      const script = document.createElement("script");
      script.src = "https://giscus.app/client.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      // Blocked or unreachable widget: collapse the reserved space and show
      // the plain link to the Discussions page instead.
      script.onerror = () => {
        delete commentsMount.dataset.loaded;
        script.remove();
        const fallback = document.querySelector("[data-giscus-fallback]");
        if (fallback) {
          fallback.hidden = false;
        }
      };
      const config = {
        "data-repo": commentsMount.dataset.repo,
        "data-repo-id": commentsMount.dataset.repoId,
        "data-category": commentsMount.dataset.category,
        "data-category-id": commentsMount.dataset.categoryId,
        "data-mapping": "pathname",
        "data-strict": "0",
        "data-reactions-enabled": "1",
        "data-emit-metadata": "0",
        "data-input-position": "top",
        "data-lang": "en",
        "data-theme": giscusTheme(),
      };
      Object.keys(config).forEach((key) => {
        script.setAttribute(key, config[key]);
      });
      commentsMount.appendChild(script);
    };

    if ("IntersectionObserver" in window) {
      const commentsObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            injectGiscus();
            commentsObserver.disconnect();
          }
        },
        { rootMargin: "200px 0px" }
      );
      commentsObserver.observe(commentsMount);
    } else {
      injectGiscus();
    }

    // Registered after the toggle's own listener, so this reads the state
    // applyTheme just set.
    if (themeToggle) {
      themeToggle.addEventListener("click", syncGiscusTheme);
    }
    const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof schemeQuery.addEventListener === "function") {
      schemeQuery.addEventListener("change", syncGiscusTheme);
    }
  }

  const navToggle = document.querySelector("[data-nav-toggle]");
  const portfolioHeader = document.querySelector("[data-portfolio-header]");
  const navMenu = document.querySelector("[data-nav-menu]");
  if (navToggle && portfolioHeader && navMenu) {
    const setMenu = (open) => {
      portfolioHeader.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    navToggle.addEventListener("click", () => {
      setMenu(!portfolioHeader.classList.contains("is-open"));
    });

    // Close after choosing a destination (the menu links are in-page anchors).
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    // Close on Escape and return focus to the toggle.
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && portfolioHeader.classList.contains("is-open")) {
        setMenu(false);
        navToggle.focus();
      }
    });

    // Close when clicking outside the header.
    document.addEventListener("click", (event) => {
      if (
        portfolioHeader.classList.contains("is-open") &&
        !portfolioHeader.contains(event.target)
      ) {
        setMenu(false);
      }
    });
  }

  // Glossary term popovers (Lab posts): hover opens on pointer devices, tap
  // toggles on touch, focus/Escape cover keyboards. One card open at a time;
  // --term-shift nudges a card back inside the viewport when the term sits
  // near an edge.
  const termEls = Array.from(document.querySelectorAll("[data-term]"));
  if (termEls.length) {
    const closeTerm = (term) => {
      term.classList.remove("is-open");
      term.querySelector(".term__trigger").setAttribute("aria-expanded", "false");
    };
    const closeAllTerms = (except) => {
      termEls.forEach((term) => {
        if (term !== except) {
          closeTerm(term);
        }
      });
    };

    // Cards open above the term; when the sticky header would clip them,
    // openTerm flips them below instead.
    const header = document.querySelector(".portfolio-header");
    const stickyOffset = (header ? header.getBoundingClientRect().height : 80) + 6;

    termEls.forEach((term) => {
      const trigger = term.querySelector(".term__trigger");
      const card = term.querySelector(".term__card");
      if (!trigger || !card) {
        return;
      }
      let closeTimer = 0;

      const openTerm = () => {
        window.clearTimeout(closeTimer);
        closeAllTerms(term);
        term.classList.remove("is-flipped");
        term.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        // Keep the card on screen: measure at center, then shift as needed.
        card.style.setProperty("--term-shift", "0px");
        const rect = card.getBoundingClientRect();
        const pad = 12;
        let shift = 0;
        if (rect.left < pad) {
          shift = pad - rect.left;
        } else if (rect.right > window.innerWidth - pad) {
          shift = window.innerWidth - pad - rect.right;
        }
        card.style.setProperty("--term-shift", `${shift}px`);
        // No room above (sticky header) — open below the term instead.
        if (rect.top < stickyOffset) {
          term.classList.add("is-flipped");
        }
      };

      trigger.addEventListener("click", () => {
        window.clearTimeout(closeTimer);
        if (term.classList.contains("is-open")) {
          closeTerm(term);
        } else {
          openTerm();
        }
      });
      // Hover only for real mice — on touch, pointerenter + focus precede the
      // click, and opening there would make the click instantly toggle back.
      // Closing waits a grace period so the pointer can travel into the card
      // (to reach its link) without the popover vanishing en route.
      term.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") {
          window.clearTimeout(closeTimer);
          if (!term.classList.contains("is-open")) {
            openTerm();
          }
        }
      });
      term.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "mouse") {
          window.clearTimeout(closeTimer);
          closeTimer = window.setTimeout(() => closeTerm(term), 260);
        }
      });
      trigger.addEventListener("focus", () => {
        // Keyboard focus only (tab); pointer-initiated focus is handled above.
        try {
          if (trigger.matches(":focus-visible")) {
            openTerm();
          }
        } catch (error) {
          openTerm();
        }
      });
      // Close when focus leaves the term entirely (the card link is inside).
      term.addEventListener("focusout", (event) => {
        if (!term.contains(event.relatedTarget)) {
          closeTerm(term);
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-term]")) {
        closeAllTerms();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllTerms();
      }
    });
    // Clicks inside a cross-origin iframe (e.g. the giscus widget) never
    // reach this document — but they do blur the window, so close there too.
    window.addEventListener("blur", () => closeAllTerms());
  }

  // Browsers with cross-document view transitions (PageRevealEvent is the
  // support signal) animate every same-origin navigation natively — including
  // back/forward, which no script can intercept — via the @view-transition
  // opt-in in head.html and the ::view-transition rules in _portfolio.scss.
  // There the scripted fade below stands down, so clicks also lose its 320ms
  // delay. Others keep the scripted fade.
  const supportsViewTransitions = "PageRevealEvent" in window;

  // A skipped view transition is a graceful fallback, not a failure: the
  // browser abandons the animation (rapid clicks, hidden tab, a page that
  // takes longer than its ~4s deadline) and swaps instantly. But the
  // transition object it already created rejects its promises with
  // AbortError, and since nothing else ever touches them, every skip used to
  // surface as "Uncaught (in promise) AbortError: Transition was skipped"
  // in the console. Observe and discard — the swap itself already happened.
  if (supportsViewTransitions) {
    const silenceSkippedTransition = (event) => {
      const vt = event.viewTransition;
      if (!vt) {
        return;
      }
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
      vt.updateCallbackDone.catch(() => {});
    };
    window.addEventListener("pageswap", silenceSkippedTransition);
    window.addEventListener("pagereveal", silenceSkippedTransition);
  }

  // Cross-page fade: fade the current page out, then navigate; the next page
  // fades itself in via the page-enter CSS animation. The duration is read
  // from the --page-fade token in _portfolio.scss (single source of truth);
  // +20ms lets the transition finish before the navigation starts.
  const fadeToken = getComputedStyle(document.body)
    .getPropertyValue("--page-fade")
    .trim();
  const fadeTokenMs = fadeToken.endsWith("ms")
    ? parseFloat(fadeToken)
    : parseFloat(fadeToken) * 1000;
  const PAGE_FADE_MS = (Number.isFinite(fadeTokenMs) ? fadeTokenMs : 300) + 20;
  let leavingPage = false;

  document.addEventListener("click", (event) => {
    // Native view transitions handle the whole fade — don't double up.
    if (supportsViewTransitions) {
      return;
    }
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    // Modified clicks mean "open elsewhere" — leave them to the browser.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download")) {
      return;
    }
    if (link.target && link.target !== "_self") {
      return;
    }
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    // Direct file targets (resume PDF, images) are documents, not pages that
    // fade back in — open them without the exit fade.
    if (/\.(pdf|zip|jpe?g|png|webp|gif|svg)$/i.test(url.pathname)) {
      return;
    }
    // Same-page hash jumps keep the native smooth scroll.
    if (url.pathname === window.location.pathname && url.hash) {
      return;
    }
    if (prefersReducedMotion.matches) {
      return;
    }
    event.preventDefault();
    if (leavingPage) {
      return;
    }
    leavingPage = true;
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = url.href;
    }, PAGE_FADE_MS);
  });

  // Back/forward restores usually come from the back/forward cache (bfcache):
  // the page returns as a frozen snapshot — scripts don't rerun and load
  // animations don't replay, so it would just pop in (possibly still faded
  // out from when we left it). Clear the exit state and restart page-enter
  // (inline animation:none + forced reflow, then hand back to the stylesheet)
  // so history navigation fades in like any other arrival. Non-bfcache
  // back/forward is a real page load and fades in on its own.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) {
      return;
    }
    leavingPage = false;
    document.body.classList.remove("is-leaving");
    if (prefersReducedMotion.matches) {
      return;
    }
    document.body.style.animation = "none";
    void document.body.offsetWidth;
    document.body.style.animation = "";
  });
})();
