(() => {
  const htmlEl = document.documentElement;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    htmlEl.classList.add("js");
    try {
      if (sessionStorage.getItem("espada-nav")) {
        sessionStorage.removeItem("espada-nav");
        htmlEl.classList.add("is-entering");
      }
    } catch (e) {}
    try {
      const n = performance.getEntriesByType("navigation")[0];
      if (n && n.type === "back_forward") {
        htmlEl.classList.add("is-entering", "is-back");
      }
    } catch (e) {}
  }

  const start = () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis = null;
    const heroArts = [...document.querySelectorAll(".hero__art")];
    const root = document.documentElement;
    const narrow = matchMedia("(max-width: 1100px)");
    const setParallax = (y) => {
      if (narrow.matches) return;
      heroArts.forEach((a) =>
        a.style.setProperty("--py", Math.min(y * 0.08, 40).toFixed(1) + "px"),
      );
      scrollFx(y);
    };

    function go(url) {
      if (reduceMotion) {
        location.href = url;
        return;
      }
      try {
        sessionStorage.setItem("espada-nav", "1");
      } catch (e) {}
      root.classList.add("is-leaving");
      setTimeout(() => {
        location.href = url;
      }, 650);
    }

    const heroEl = document.querySelector(".hero");
    const darkEls = [...document.querySelectorAll(".dark")];

    let darkTops = [];
    const measureDark = () => {
      darkTops = darkEls.map((el) => el.getBoundingClientRect().top + scrollY);
    };
    function scrollFx(y) {
      if (reduceMotion) return;
      if (heroEl) {
        heroEl.style.setProperty(
          "--ty",
          Math.min(y * 0.16, 140).toFixed(1) + "px",
        );
        heroEl.style.setProperty(
          "--ty2",
          Math.min(y * 0.07, 60).toFixed(1) + "px",
        );
      }
      if (darkTops.length !== darkEls.length) measureDark();
      const vh = innerHeight;
      darkEls.forEach((el, i) => {
        const top = darkTops[i] - y;
        const p = Math.min(1, Math.max(0, 1 - top / (vh * 0.95)));
        el.style.setProperty("--sp", (0.94 + 0.06 * p).toFixed(4));
      });
    }
    addEventListener("load", measureDark);
    addEventListener("resize", measureDark);

    function createSmooth() {
      const maxScroll = () =>
        Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const clamp = (y) => Math.min(maxScroll(), Math.max(0, y));
      let cur = scrollY,
        target = scrollY,
        last = scrollY,
        tween = null,
        rafId = 0,
        prev = 0,
        lambda = 6;
      const subs = [];
      const emit = () => subs.forEach((f) => f({ scroll: cur }));
      const set = (y) => {
        last = y;
        cur = y;
        scrollTo(0, y);
      };
      const tick = (now) => {
        rafId = 0;
        const dt = prev ? Math.min(0.064, (now - prev) / 1000) : 1 / 60;
        prev = now;
        if (tween) {
          const p = Math.min(1, (now - tween.t0) / tween.dur);
          target = tween.to;
          set(tween.from + (tween.to - tween.from) * tween.ease(p));
          if (p >= 1) tween = null;
        } else {
          const k = 1 - Math.exp(-lambda * dt);
          const next = cur + (target - cur) * k;
          set(Math.abs(target - next) < 0.25 ? target : next);
        }
        emit();
        if (tween || Math.abs(target - cur) > 0.25) kick();
        else prev = 0;
      };
      const kick = () => {
        if (!rafId) rafId = requestAnimationFrame(tick);
      };
      addEventListener(
        "wheel",
        (e) => {
          if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
          if (
            e.target.closest &&
            e.target.closest("textarea,[data-native-scroll]")
          )
            return;
          e.preventDefault();
          let dy = e.deltaY;
          if (e.deltaMode === 1) dy *= 16;
          else if (e.deltaMode === 2) dy *= innerHeight;

          lambda = e.deltaMode === 0 && Math.abs(e.deltaY) < 40 ? 12 : 6;
          tween = null;
          target = clamp(target + dy);
          kick();
        },
        { passive: false },
      );
      addEventListener("keydown", (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const el = e.target;
        const tag = ((el && el.tagName) || "").toLowerCase();
        if (["input", "textarea", "select"].includes(tag)) return;
        if (el && el.isContentEditable) return;
        const vh = innerHeight;
        let to = null;
        switch (e.key) {
          case "ArrowDown":
            to = target + 90;
            break;
          case "ArrowUp":
            to = target - 90;
            break;
          case "PageDown":
            to = target + vh * 0.85;
            break;
          case "PageUp":
            to = target - vh * 0.85;
            break;
          case " ":
            if (tag === "button" || tag === "a") return;
            to = target + (e.shiftKey ? -1 : 1) * vh * 0.85;
            break;
          case "Home":
            to = 0;
            break;
          case "End":
            to = maxScroll();
            break;
        }
        if (to === null) return;
        e.preventDefault();
        lambda = 7;
        tween = null;
        target = clamp(to);
        kick();
      });

      addEventListener(
        "scroll",
        () => {
          if (Math.abs(scrollY - last) > 1.5) {
            cur = target = last = scrollY;
            tween = null;
            emit();
          }
        },
        { passive: true },
      );
      addEventListener("resize", () => {
        target = clamp(target);
      });
      return {
        on(_, f) {
          subs.push(f);
        },
        scrollTo(to, o = {}) {
          let y =
            typeof to === "number"
              ? to
              : to.getBoundingClientRect().top + scrollY + (o.offset || 0);
          y = clamp(y);
          if (o.immediate) {
            tween = null;
            target = y;
            set(y);
            emit();
            return;
          }
          tween = {
            from: cur,
            to: y,
            t0: performance.now(),
            dur: (o.duration || 1.2) * 1000,

            ease: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
          };
          kick();
        },
      };
    }

    if (!reduceMotion) {
      lenis = createSmooth();
      root.classList.add("lenis", "lenis-smooth");
      lenis.on("scroll", (e) => setParallax(e.scroll));
      document.addEventListener("click", (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute("href") === "#") return;
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -100, duration: 1.6 });
      });
    }

    function splitWords(el) {
      let i = 0;
      const walk = (node) =>
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((p) => {
              if (!p) return;
              if (/^\s+$/.test(p)) {
                frag.appendChild(document.createTextNode(" "));
                return;
              }
              const w = document.createElement("span");
              w.className = "w";
              const wi = document.createElement("span");
              wi.className = "wi";
              wi.style.setProperty("--i", i++);
              wi.textContent = p;
              w.appendChild(wi);
              frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
        });
      const orig = el.innerHTML;
      walk(el);
      el.classList.add("split");

      const mo = new MutationObserver(() => {
        if (!el.classList.contains("in")) return;
        mo.disconnect();
        setTimeout(
          () => {
            el.innerHTML = orig;
            el.classList.remove("split");
          },
          i * 55 + 1500,
        );
      });
      mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    }
    if (!reduceMotion)
      document
        .querySelectorAll(
          ".h2,.hero h1,.page-hero h1,.contacts__info h1,.thanks h1,.doc h1,.doc__h2,.faq h3",
        )
        .forEach(splitWords);

    const enterDelay = root.classList.contains("is-entering") ? 450 : 0;

    setTimeout(() => {
      if (!reduceMotion && "IntersectionObserver" in window) {
        const groups =
          ".section>.eyebrow,.section>.h2,.dark .eyebrow,.dark .h2,.steps-wrap .eyebrow,.steps-wrap .h2,.adv li,.card,.steps li,.niches__head,.niche,.niche-cta,.request__in>*,.page-hero>*,.svc__text,.svc__card,.cta-bar__in>*";
        const io = new IntersectionObserver(
          (es) =>
            es.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("in");
                io.unobserve(en.target);
              }
            }),
          { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
        );
        document.querySelectorAll(groups + ",.split,.faq>div").forEach((el) => {
          const sibs = [...el.parentElement.children].filter((s) =>
            s.matches(groups),
          );
          const isFaq = el.matches(".faq>div");
          if (!el.classList.contains("split") && !isFaq) el.dataset.reveal = "";
          el.style.setProperty(
            "--d",
            (isFaq
              ? ([...el.parentElement.children].indexOf(el) % 2) * 0.16
              : Math.max(0, sibs.indexOf(el)) * 0.09
            ).toFixed(2) + "s",
          );
          io.observe(el);
        });
      } else
        document
          .querySelectorAll(".split,.faq>div")
          .forEach((el) => el.classList.add("in"));
    }, enterDelay);

    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      heroArts.forEach((a) => a.pauseAnimations && a.pauseAnimations());

    const bigArt = document.getElementById("heroArt");
    const syncArts = (visible) => {
      heroArts.forEach((a) => {
        const isBig = a === bigArt;
        const run = visible && (isBig ? !narrow.matches : narrow.matches);
        if (run) a.unpauseAnimations && a.unpauseAnimations();
        else a.pauseAnimations && a.pauseAnimations();
      });
    };
    let heroVisible = true;
    if (heroEl && "IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        heroVisible = es[es.length - 1].isIntersecting;
        root.classList.toggle("hero-off", !heroVisible);
        syncArts(heroVisible);
      }).observe(heroEl);
    }
    narrow.addEventListener("change", () => syncArts(heroVisible));
    syncArts(true);

    const sb = document.createElement("div");
    sb.className = "sb";
    sb.hidden = true;
    const thumb = document.createElement("i");
    sb.appendChild(thumb);
    document.body.appendChild(sb);
    const de = document.documentElement;
    const metrics = () => {
      const vh = innerHeight,
        dh = de.scrollHeight,
        track = sb.clientHeight || vh - 16;
      const h = Math.max(48, (track * vh) / dh);
      return { vh, dh, track, h, max: dh - vh, free: track - h };
    };
    const paint = () => {
      const m = metrics();
      sb.hidden = m.max <= 1;
      if (sb.hidden) return;
      thumb.style.height = m.h + "px";
      thumb.style.transform = `translateY(${(scrollY / m.max) * m.free}px)`;
    };
    addEventListener("scroll", paint, { passive: true });
    addEventListener("resize", paint);
    new ResizeObserver(paint).observe(document.body);
    paint();
    thumb.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);
      sb.classList.add("is-drag");
      const startY = e.clientY,
        startScroll = scrollY,
        m = metrics();
      const move = (ev) => {
        const to = Math.min(
          m.max,
          Math.max(0, startScroll + ((ev.clientY - startY) * m.max) / m.free),
        );
        lenis ? lenis.scrollTo(to, { immediate: true }) : scrollTo(0, to);
      };
      const up = () => {
        sb.classList.remove("is-drag");
        thumb.removeEventListener("pointermove", move);
        thumb.removeEventListener("pointerup", up);
        thumb.removeEventListener("pointercancel", up);
      };
      thumb.addEventListener("pointermove", move);
      thumb.addEventListener("pointerup", up);
      thumb.addEventListener("pointercancel", up);
    });

    const burger = document.getElementById("burger"),
      menu = document.getElementById("mobile-menu");
    const toggle = (open) => {
      burger.setAttribute("aria-expanded", open);
      menu.hidden = !open;
    };
    burger.addEventListener("click", () => toggle(menu.hidden));
    menu.addEventListener(
      "click",
      (e) => e.target.tagName === "A" && toggle(false),
    );

    const fmtPhone = (raw) => {
      let d = raw.replace(/\D/g, "");
      if (d.length > 10 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
      d = d.slice(0, 10);
      return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)]
        .filter(Boolean)
        .join(" ");
    };
    document.querySelectorAll("[data-phone]").forEach((input) => {
      input.addEventListener("input", () => {
        input.value = fmtPhone(input.value);
      });
    });

    const ENDPOINT = "https://my-bot.hellthawstar.workers.dev";

    const TEST_MODE = false;
    document.querySelectorAll("[data-form]").forEach((form) => {
      const status = form.querySelector(".form__status");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        status.className = "form__status";
        status.textContent = "";
        let ok = true;
        form.querySelectorAll("[required]").forEach((el) => {
          const bad =
            el.type === "checkbox"
              ? !el.checked
              : el.dataset.phone !== undefined
                ? el.value.replace(/\D/g, "").length < 10
                : !el.value.trim();
          el.classList.toggle("invalid", bad);
          if (bad) ok = false;
        });
        if (!ok) {
          status.classList.add("err");
          status.textContent = "Проверьте выделенные поля.";
          return;
        }

        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        const data = Object.fromEntries(new FormData(form));
        if (data.phone) data.phone = "+7 " + data.phone;
        try {
          if (TEST_MODE) {
            await new Promise((r) => setTimeout(r, 600));
            console.info(
              "[TEST_MODE] заявка не отправлена, данные формы:",
              data,
            );
          } else {
            // Отправляем данные на наш безопасный сервер Cloudflare
            const res = await fetch(ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(res.status);
          }

          form.reset();
          status.classList.add("ok");
          status.textContent =
            "Заявка отправлена. Мы свяжемся с вами в выбранном мессенджере.";
          if (form.dataset.success) go(form.dataset.success);
        } catch {
          status.classList.add("err");
          status.textContent =
            "Не удалось отправить заявку. Попробуйте ещё раз.";
        } finally {
          btn.disabled = false;
        }
      });
      form.addEventListener("input", (e) =>
        e.target.classList.remove("invalid"),
      );
    });

    if (!reduceMotion) {
      document.querySelectorAll(".logo").forEach((a) => {
        if (!a.getAttribute("aria-label"))
          a.setAttribute("aria-label", "Espada Company");
        const sp = a.querySelector("span");
        if (!sp || sp.querySelector("em")) return;
        const txt = sp.textContent.trim();
        sp.textContent = "";
        [...txt].forEach((ch, i) => {
          const em = document.createElement("em");
          em.className = "lt";
          em.setAttribute("aria-hidden", "true");
          em.style.setProperty("--i", i);
          em.textContent = ch;
          sp.appendChild(em);
        });
      });
    }

    if (root.classList.contains("is-entering")) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          root.classList.add("is-exit");
          root.classList.remove("is-entering");
          setTimeout(() => root.classList.remove("is-exit", "is-back"), 900);
        }),
      );
    }
    addEventListener("pageshow", (e) => {
      if (!e.persisted) return;

      root.classList.remove("is-leaving", "is-exit");
      if (reduceMotion) {
        root.classList.remove("is-entering", "is-back");
        return;
      }
      root.classList.add("is-entering", "is-back");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          root.classList.add("is-exit");
          root.classList.remove("is-entering");
          setTimeout(() => root.classList.remove("is-exit", "is-back"), 900);
        }),
      );
    });
    document.addEventListener("click", (e) => {
      if (
        reduceMotion ||
        e.defaultPrevented ||
        e.button ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = e.target.closest("a[href]");
      if (!a || a.target || a.hasAttribute("download")) return;
      let u;
      try {
        u = new URL(a.href, location.href);
      } catch (err) {
        return;
      }
      if (u.protocol !== location.protocol || u.host !== location.host) return;
      if (u.pathname === location.pathname) return;
      if (!/(\.html|\/)$/.test(u.pathname)) return;
      e.preventDefault();
      go(u.href);
    });

    if (
      !reduceMotion &&
      matchMedia("(hover:hover) and (pointer:fine)").matches
    ) {
      const glow = document.createElement("div");
      glow.className = "cur-glow";
      document.body.append(glow);
      let x = innerWidth / 2,
        y = innerHeight / 2,
        gx = x,
        gy = y,
        gsc = 1,
        shown = false;
      addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType !== "mouse") return;
          x = e.clientX;
          y = e.clientY;
          if (!shown) {
            shown = true;
            gx = x;
            gy = y;
            root.classList.add("has-cursor");
          }
          const t = e.target.closest ? e.target : null;
          const onDark =
            t &&
            t.closest(".dark,.hero,.n2") &&
            !t.closest(".hero__form,.form--card,.quick,.contact-card");
          root.classList.toggle("cur-dark", !!onDark);
        },
        { passive: true },
      );
      document.documentElement.addEventListener("pointerleave", () => {
        glow.classList.add("is-out");
      });
      document.documentElement.addEventListener("pointerenter", () => {
        glow.classList.remove("is-out");
      });
      const loop = () => {
        const speed = Math.hypot(x - gx, y - gy);
        gx += (x - gx) * 0.38;
        gy += (y - gy) * 0.38;
        gsc += (1 + Math.min(speed * 0.008, 0.3) - gsc) * 0.2;
        glow.style.transform = `translate3d(${gx - 150}px,${gy - 150}px,0) scale(${gsc.toFixed(3)})`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      document
        .querySelectorAll(".btn:not(.btn--block),.burger")
        .forEach((b) => {
          b.addEventListener("pointermove", (e) => {
            const r = b.getBoundingClientRect();
            const mx = (e.clientX - (r.left + r.width / 2)) * 0.28,
              my = (e.clientY - (r.top + r.height / 2)) * 0.4;
            b.style.translate = `${mx.toFixed(1)}px ${my.toFixed(1)}px`;
          });
          b.addEventListener("pointerleave", () => {
            b.style.translate = "";
          });
        });

      document.querySelectorAll(".card").forEach((c) =>
        c.addEventListener("pointermove", (e) => {
          const r = c.getBoundingClientRect();
          c.style.setProperty("--mx", e.clientX - r.left + "px");
          c.style.setProperty("--my", e.clientY - r.top + "px");
        }),
      );
    }

    scrollFx(scrollY);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
//проверка
