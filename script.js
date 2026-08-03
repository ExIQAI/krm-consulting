export const TESTIMONIALS = Object.freeze([
  {
    title: "World Surf League",
    organisation: "Google for Publishers customer story",
    videoId: "hJYOADLk4hU",
    sourceUrl: "https://www.youtube.com/watch?v=hJYOADLk4hU",
    summary:
      "An external customer-story example showing how a real video testimonial can add human proof to a strategic narrative.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
  {
    title: "El Clasificado",
    organisation: "Google for Publishers customer story",
    videoId: "hV5xGbiG0yw",
    sourceUrl: "https://www.youtube.com/watch?v=hV5xGbiG0yw",
    summary:
      "An external example selected to demonstrate the pacing, hierarchy and source attribution of KRM's future client stories.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
  {
    title: "Curb Free with Cory Lee",
    organisation: "Google for Publishers customer story",
    videoId: "T60qPeU_eoQ",
    sourceUrl: "https://www.youtube.com/watch?v=T60qPeU_eoQ",
    summary:
      "An external example showing how accessible video, a clear summary and an attributed source work together.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
]);

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function setupNavigation() {
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    nav.removeAttribute("data-open");
  };

  toggle.addEventListener("click", () => {
    const willOpen = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(willOpen));
    toggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
    nav.toggleAttribute("data-open", willOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      toggle.focus();
    }
  });
}

function setupScrollStory() {
  const steps = $$(".story-step[data-chapter]");
  const signal = $(".signal-visual");
  const label = $("[data-signal-label]");
  if (!steps.length) return;

  const activate = (step) => {
    steps.forEach((item) => item.toggleAttribute("data-active", item === step));
    const chapter = step.dataset.chapter;
    if (signal) signal.dataset.state = chapter;
    if (label) label.textContent = chapter;
  };

  activate(steps[0]);
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activate(visible.target);
    },
    { rootMargin: "-25% 0px -25%", threshold: [0.2, 0.45, 0.7] },
  );

  steps.forEach((step) => observer.observe(step));
}

function setupReveals() {
  const items = $$(".reveal");
  if (!items.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.setAttribute("data-visible", ""));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-visible", "");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.15 },
  );

  items.forEach((item) => observer.observe(item));
}

function setupTestimonials() {
  const selectors = $("#video-selectors");
  const play = $("#video-play");
  const poster = $("#video-poster");
  const title = $("#video-title");
  const organisation = $("#video-organisation");
  const summary = $("#video-summary");
  const source = $("#video-source");
  const frameSlot = $("#video-frame-slot");

  if (!selectors || !play || !poster || !title || !organisation || !summary || !source || !frameSlot) return;

  let selectedIndex = 0;

  const posterUrl = (videoId, quality = "maxresdefault") =>
    `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;

  const resetPlayer = () => {
    frameSlot.replaceChildren();
    play.hidden = false;
  };

  const renderSelection = (index, focus = false) => {
    selectedIndex = index;
    const item = TESTIMONIALS[index];
    resetPlayer();
    poster.src = posterUrl(item.videoId);
    poster.alt = `Video preview for ${item.title}`;
    poster.dataset.fallback = "false";
    title.textContent = item.title;
    organisation.textContent = item.organisation;
    summary.textContent = item.summary;
    source.href = item.sourceUrl;
    source.textContent = `View ${item.title} on YouTube`;
    play.setAttribute("aria-label", `Load the ${item.title} demonstration video`);

    $$("button", selectors).forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      button.toggleAttribute("data-active", active);
    });

    if (focus) $$("button", selectors)[index]?.focus();
  };

  poster.addEventListener("error", () => {
    if (poster.dataset.fallback === "true") return;
    poster.dataset.fallback = "true";
    poster.src = posterUrl(TESTIMONIALS[selectedIndex].videoId, "hqdefault");
  });

  TESTIMONIALS.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "video-selector";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "video-feature");
    button.innerHTML = `<span class="video-selector__number">0${index + 1}</span><span><strong>${item.title}</strong><small>${item.organisation}</small><em>${item.disclaimer}</em></span>`;
    button.addEventListener("click", () => renderSelection(index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = TESTIMONIALS.length - 1;
      else if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % TESTIMONIALS.length;
      else next = (index - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
      renderSelection(next, true);
    });
    selectors.append(button);
  });

  play.addEventListener("click", () => {
    const item = TESTIMONIALS[selectedIndex];
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&modestbranding=1`;
    iframe.title = `${item.title} — external demonstration video`;
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    frameSlot.replaceChildren(iframe);
    play.hidden = true;
    iframe.focus();
  });

  renderSelection(0);
}

function setupDemoForm() {
  const form = $("#demo-form");
  const button = $("#demo-submit");
  const status = $("#form-status");
  if (!form || !button || !status) return;

  const runDemo = () => {
    if (!form.reportValidity()) {
      status.textContent = "Please complete the required fields to preview the form response.";
      status.dataset.state = "error";
      return;
    }

    status.textContent = "Demo complete — your information was not sent or stored.";
    status.dataset.state = "success";
    form.reset();
    button.textContent = "Demo complete";
    window.setTimeout(() => {
      button.textContent = "Preview enquiry response";
    }, 2400);
  };

  button.addEventListener("click", runDemo);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      runDemo();
    }
  });
}

function setupHeader() {
  const header = $(".site-header");
  if (!header) return;
  const update = () => header.toggleAttribute("data-scrolled", window.scrollY > 24);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

if (typeof document !== "undefined") {
  setupNavigation();
  setupHeader();
  setupScrollStory();
  setupReveals();
  setupTestimonials();
  setupDemoForm();
}
