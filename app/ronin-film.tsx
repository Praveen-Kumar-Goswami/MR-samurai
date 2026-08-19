import { useEffect, useRef, useState } from "react";

type Phase = "loading" | "revealing" | "interactive";

type TrailPoint = {
  x: number;
  y: number;
  born: number;
  radius: number;
  speed: number;
  angle: number;
};

const chapters = [
  { id: "origin", number: "01", japanese: "武士道", label: "BUSHIDŌ", title: "WAY OF THE WARRIOR" },
  { id: "honor", number: "02", japanese: "名誉", label: "MEIYO", title: "HONOR WITHOUT FEAR" },
  { id: "discipline", number: "03", japanese: "鍛錬", label: "TANREN", title: "DISCIPLINE IS POWER" },
  { id: "silence", number: "04", japanese: "静寂", label: "SEIJAKU", title: "MASTER THE SILENCE" },
  { id: "path", number: "05", japanese: "道", label: "THE WAY", title: "THE PATH NEVER ENDS." },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  positionX = 0.73,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  const x = (width - renderedWidth) * positionX;
  const y = (height - renderedHeight) * 0.5;
  context.drawImage(image, x, y, renderedWidth, renderedHeight);
}

export function RoninFilm() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLImageElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderRingRef = useRef<SVGCircleElement>(null);
  const loaderValueRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorLabelRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<Phase>("loading");
  const readinessRef = useRef({ image: false, canvas: false, video: false, fonts: false });
  const [phase, setPhase] = useState<Phase>("loading");
  const [activeChapter, setActiveChapter] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "interactive") {
      document.body.classList.add("ronin-ready");
      document.body.style.overflow = "";
    } else {
      document.body.classList.remove("ronin-ready");
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.classList.remove("ronin-ready");
      document.body.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndexOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("index-open", indexOpen);
    return () => document.body.classList.remove("index-open");
  }, [indexOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    video.defaultMuted = true;

    const markVideoReady = () => {
      if (disposed || video.readyState < 2) return;
      const withFrameCallback = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number;
      };
      if (withFrameCallback.requestVideoFrameCallback) {
        withFrameCallback.requestVideoFrameCallback(() => {
          if (!disposed) readinessRef.current.video = true;
        });
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!disposed) readinessRef.current.video = true;
          });
        });
      }
    };

    video.addEventListener("loadeddata", markVideoReady);
    video.addEventListener("canplay", markVideoReady);
    if (video.readyState >= 2) markVideoReady();
    void video.play().catch(() => {
      if (video.readyState >= 2) readinessRef.current.video = true;
    });

    return () => {
      disposed = true;
      video.removeEventListener("loadeddata", markVideoReady);
      video.removeEventListener("canplay", markVideoReady);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let revealTimer = 0;
    let interactiveTimer = 0;
    const startedAt = performance.now();
    const circumference = 326.73;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumDwell = reducedMotion ? 320 : 1550;
    let displayed = 0;
    let completed = false;

    document.fonts.ready.then(() => {
      if (!disposed) readinessRef.current.fonts = true;
    });

    const tick = (stamp: number) => {
      if (disposed) return;
      const elapsed = stamp - startedAt;
      const ready = readinessRef.current;
      const allCritical = ready.image && ready.canvas && ready.video && ready.fonts;
      const timedOut = elapsed > 8000;
      const timeShare = Math.min(10, (elapsed / minimumDwell) * 10);
      let target =
        timeShare +
        (ready.image ? 25 : 0) +
        (ready.canvas ? 15 : 0) +
        (ready.video ? 40 : 0) +
        (ready.fonts ? 10 : 0);

      if ((!allCritical || elapsed < minimumDwell) && !timedOut) target = Math.min(target, 94);
      if ((allCritical && elapsed >= minimumDwell) || timedOut) target = 100;

      displayed += (target - displayed) * (target === 100 ? 0.1 : 0.055);
      if (target === 100 && 100 - displayed < 0.16) displayed = 100;

      if (loaderRingRef.current) {
        loaderRingRef.current.style.strokeDashoffset = String(
          circumference * (1 - displayed / 100),
        );
      }
      if (loaderValueRef.current) {
        loaderValueRef.current.textContent = String(Math.round(displayed)).padStart(2, "0");
      }
      loaderRef.current?.setAttribute("aria-valuenow", String(Math.round(displayed)));

      if (displayed === 100 && !completed) {
        completed = true;
        loaderRef.current?.setAttribute("data-complete", "true");
        setPhase("revealing");
        revealTimer = window.setTimeout(() => {
          if (!disposed) setPhase("interactive");
        }, reducedMotion ? 180 : 920);
        interactiveTimer = window.setTimeout(() => {
          loaderRef.current?.setAttribute("aria-hidden", "true");
        }, reducedMotion ? 260 : 1500);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
      window.clearTimeout(interactiveTimer);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    const cursor = cursorRef.current;
    const dot = cursorDotRef.current;
    const cursorLabel = cursorLabelRef.current;
    if (!root || !canvas || !fallback || !cursor || !dot || !cursorLabel) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const image = new Image();
    image.src = "/media/image.png";
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = {
      targetX: window.innerWidth * 0.72,
      targetY: window.innerHeight * 0.48,
      x: window.innerWidth * 0.72,
      y: window.innerHeight * 0.48,
      previousX: window.innerWidth * 0.72,
      previousY: window.innerHeight * 0.48,
      emitX: window.innerWidth * 0.72,
      emitY: window.innerHeight * 0.48,
      speed: 0,
      angle: 0,
      presence: 0,
      targetPresence: finePointer ? 0 : 1,
      firstMove: true,
      touched: false,
      lastInput: performance.now(),
    };
    const trail: TrailPoint[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 1.75 : 1.35);
    let animationFrame = 0;
    let imageReady = false;
    let lastTrailStamp = 0;
    let firstPulse = 0;
    let hidden = document.hidden;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 1.75 : 1.35);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (imageReady && reducedMotion) {
        context.clearRect(0, 0, width, height);
        drawImageCover(context, image, width, height);
      }
    };

    const addTrailPoint = (stamp: number, force = false) => {
      if (phaseRef.current !== "interactive" || pointer.presence < 0.08) return;
      const distance = Math.hypot(pointer.x - pointer.emitX, pointer.y - pointer.emitY);
      if (!force && distance < 10 && stamp - lastTrailStamp < 36) return;

      const radius = clamp(Math.min(width, height) * 0.19 + pointer.speed * 0.14, 150, 258);
      trail.push({
        x: pointer.x,
        y: pointer.y,
        born: stamp,
        radius,
        speed: pointer.speed,
        angle: pointer.angle,
      });
      if (trail.length > (finePointer ? 18 : 10)) trail.shift();
      pointer.emitX = pointer.x;
      pointer.emitY = pointer.y;
      lastTrailStamp = stamp;
    };

    const eraseBlob = (
      point: TrailPoint,
      alpha: number,
      radius: number,
      stamp: number,
    ) => {
      const stretch = 1 + clamp(point.speed / 620, 0, 0.34);
      const breathe = 1 + Math.sin(stamp * 0.0022 + point.born * 0.006) * 0.025;
      context.save();
      context.translate(point.x, point.y);
      context.rotate(point.angle);
      context.scale(stretch, 1 / Math.sqrt(stretch));

      for (let layer = 0; layer < 3; layer += 1) {
        const layerRadius = radius * breathe * (1 - layer * 0.115);
        const driftX = Math.sin(stamp * 0.0017 + point.born * 0.009 + layer * 2.1) * 8;
        const driftY = Math.cos(stamp * 0.0013 + point.born * 0.007 + layer) * 6;
        const gradient = context.createRadialGradient(
          driftX,
          driftY,
          layerRadius * 0.06,
          0,
          0,
          layerRadius,
        );
        gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
        gradient.addColorStop(0.48, `rgba(0,0,0,${alpha * 0.98})`);
        gradient.addColorStop(0.76, `rgba(0,0,0,${alpha * 0.48})`);
        gradient.addColorStop(0.92, `rgba(0,0,0,${alpha * 0.11})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, layerRadius, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const render = (stamp: number) => {
      animationFrame = requestAnimationFrame(render);
      if (!imageReady || hidden) return;

      if (!finePointer && !pointer.touched && phaseRef.current === "interactive") {
        pointer.targetX = width * (0.69 + Math.sin(stamp * 0.00021) * 0.09);
        pointer.targetY = height * (0.47 + Math.cos(stamp * 0.00017) * 0.12);
      }

      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      const followEase = finePointer ? 0.17 : 0.045;
      pointer.x += (pointer.targetX - pointer.x) * followEase;
      pointer.y += (pointer.targetY - pointer.y) * followEase;
      const dx = pointer.x - pointer.previousX;
      const dy = pointer.y - pointer.previousY;
      const instantSpeed = Math.hypot(pointer.targetX - pointer.x, pointer.targetY - pointer.y);
      pointer.speed += (instantSpeed - pointer.speed) * 0.12;
      if (Math.abs(dx) + Math.abs(dy) > 0.05) pointer.angle = Math.atan2(dy, dx);
      pointer.presence += (pointer.targetPresence - pointer.presence) * 0.1;
      firstPulse *= 0.93;

      root.style.setProperty("--pointer-x", String(pointer.targetX / width - 0.5));
      root.style.setProperty("--pointer-y", String(pointer.targetY / height - 0.5));

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      drawImageCover(context, image, width, height);

      const interactive = phaseRef.current === "interactive" && !reducedMotion;
      if (interactive) {
        addTrailPoint(stamp);
        context.globalCompositeOperation = "destination-out";

        for (let index = trail.length - 1; index >= 0; index -= 1) {
          const point = trail[index];
          const life = clamp(520 + point.speed * 0.7, 520, 860);
          const age = stamp - point.born;
          if (age > life) {
            trail.splice(index, 1);
            continue;
          }
          const progress = age / life;
          const fade = Math.pow(1 - progress, 1.75);
          eraseBlob(point, fade * 0.58, point.radius * (0.98 - progress * 0.36), stamp);
        }

        if (pointer.presence > 0.01) {
          const idleFor = stamp - pointer.lastInput;
          const idleScale = idleFor > 130 ? 0.92 : 1;
          const baseRadius = clamp(
            Math.min(width, height) * 0.2 + pointer.speed * 0.1,
            finePointer ? 158 : 132,
            finePointer ? 260 : 205,
          );
          const headRadius = baseRadius * idleScale * (1 + firstPulse * 0.12);
          eraseBlob(
            {
              x: pointer.x,
              y: pointer.y,
              born: 0,
              radius: headRadius,
              speed: pointer.speed,
              angle: pointer.angle,
            },
            pointer.presence,
            headRadius,
            stamp,
          );
        }
      }

      cursor.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      dot.style.transform = `translate3d(${pointer.targetX}px, ${pointer.targetY}px, 0)`;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") pointer.touched = true;
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.targetPresence = 1;
      pointer.lastInput = performance.now();
      if (phaseRef.current === "interactive" && finePointer) {
        cursor.dataset.visible = "true";
        dot.dataset.visible = "true";
      }
      if (pointer.firstMove) {
        pointer.firstMove = false;
        firstPulse = 1;
        addTrailPoint(performance.now(), true);
      }
    };

    const onPointerLeave = () => {
      if (!finePointer) return;
      pointer.targetPresence = 0;
      cursor.dataset.visible = "false";
      dot.dataset.visible = "false";
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
      const mode = target?.dataset.cursor ?? "";
      const label = target?.dataset.cursorLabel ?? "";
      cursor.dataset.mode = mode;
      cursorLabel.textContent = label;
      cursor.dataset.label = label ? "true" : "false";
    };

    const onVisibilityChange = () => {
      hidden = document.hidden;
    };

    const onImageReady = () => {
      imageReady = true;
      readinessRef.current.image = true;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawImageCover(context, image, width, height);
      readinessRef.current.canvas = true;
      fallback.dataset.canvasReady = "true";
    };

    image.addEventListener("load", onImageReady);
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      image.removeEventListener("load", onImageReady);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (phase !== "interactive") return;
    const root = rootRef.current;
    if (!root) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]).then(
      ([gsapModule, scrollTriggerModule, lenisModule]) => {
        if (disposed) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        const Lenis = lenisModule.default;
        gsap.registerPlugin(ScrollTrigger);

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          root.querySelectorAll<HTMLElement>("[data-motion]").forEach((element) => {
            element.style.opacity = "1";
            element.style.transform = "none";
            element.style.filter = "none";
          });
          setActiveChapter(0);
          return;
        }

        const lenis = new Lenis({
          autoRaf: false,
          lerp: 0.085,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 0.9,
          touchMultiplier: 1.05,
          anchors: true,
        });
        const updateScrollTrigger = () => ScrollTrigger.update();
        const onScroll = (event: { velocity: number }) => {
          const skew = clamp(event.velocity * -0.08, -2.2, 2.2);
          root.style.setProperty("--scroll-skew", `${skew}deg`);
          gsap.to(root, {
            "--scroll-skew": "0deg",
            duration: 0.72,
            ease: "power3.out",
            overwrite: true,
          });
        };
        const tick = (time: number) => lenis.raf(time * 1000);

        lenis.on("scroll", updateScrollTrigger);
        lenis.on("scroll", onScroll);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        const context = gsap.context(() => {
          const sections = gsap.utils.toArray<HTMLElement>("[data-story]");
          const first = sections[0];

          if (first) {
            const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
            intro
              .from(first.querySelector("[data-kicker]"), { opacity: 0, y: 18, duration: 0.7 })
              .from(
                first.querySelectorAll("[data-line]"),
                { xPercent: -118, opacity: 0, skewX: -9, filter: "blur(18px)", stagger: 0.1, duration: 1.25 },
                "-=0.45",
              )
              .from(first.querySelector("[data-copy]"), { opacity: 0, y: 24, duration: 0.8 }, "-=0.65")
              .from(first.querySelector("[data-instruction]"), { opacity: 0, x: -16, duration: 0.65 }, "-=0.5");
          }

          sections.forEach((section, index) => {
            ScrollTrigger.create({
              trigger: section,
              start: "top center",
              end: "bottom center",
              onEnter: () => setActiveChapter(index),
              onEnterBack: () => setActiveChapter(index),
            });

            if (index === 0) {
              gsap.to(section.querySelector(".story-inner"), {
                yPercent: -10,
                opacity: 0.12,
                filter: "blur(8px)",
                ease: "none",
                scrollTrigger: { trigger: section, start: "55% center", end: "bottom top", scrub: true },
              });
            }

            if (index === 1) {
              const timeline = gsap.timeline({
                scrollTrigger: { trigger: section, start: "top 78%", end: "bottom 18%", scrub: 1.1 },
              });
              timeline
                .from(section.querySelectorAll("[data-line]"), { yPercent: 112, stagger: 0.1, ease: "power3.out" })
                .from(section.querySelector("[data-copy]"), { opacity: 0, x: -38 }, "<0.22")
                .to(section.querySelector(".story-inner"), { yPercent: -9, opacity: 0.18, filter: "blur(6px)" }, 0.72);
            }

            if (index === 2) {
              const title = section.querySelector("[data-title]");
              gsap.fromTo(
                title,
                { z: -360, rotateX: 18, opacity: 0, filter: "blur(16px)", transformOrigin: "50% 100%" },
                {
                  z: 0,
                  rotateX: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                  ease: "power2.out",
                  scrollTrigger: { trigger: section, start: "top 82%", end: "55% 45%", scrub: 1 },
                },
              );
              gsap.to(section.querySelector(".story-inner"), {
                z: 120,
                opacity: 0.1,
                filter: "blur(8px)",
                scrollTrigger: { trigger: section, start: "60% center", end: "bottom top", scrub: true },
              });
            }

            if (index === 3) {
              const timeline = gsap.timeline({
                scrollTrigger: { trigger: section, start: "top 78%", end: "bottom 20%", scrub: 1 },
              });
              timeline
                .from(section.querySelector(".vertical-kanji"), { rotate: -16, yPercent: 32, opacity: 0, filter: "blur(14px)" })
                .from(section.querySelectorAll("[data-line]"), { xPercent: -74, opacity: 0, stagger: 0.12 }, 0.1)
                .to(section.querySelector(".story-inner"), { xPercent: 8, opacity: 0.15, filter: "blur(7px)" }, 0.72);
            }

            if (index === 4) {
              const timeline = gsap.timeline({
                scrollTrigger: { trigger: section, start: "top 80%", end: "72% 36%", scrub: 1.15 },
              });
              timeline
                .from(section.querySelector(".final-kanji"), { scale: 0.35, opacity: 0, rotate: -9 })
                .from(section.querySelectorAll("[data-line]"), { yPercent: 125, opacity: 0, stagger: 0.12 }, 0.08)
                .from(section.querySelector("[data-magnetic]"), { opacity: 0, y: 30 }, 0.42);
            }
          });

          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleY(${self.progress})`;
              }
            },
          });
        }, root);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => ScrollTrigger.refresh());
        });

        cleanup = () => {
          context.revert();
          gsap.ticker.remove(tick);
          lenis.off("scroll", updateScrollTrigger);
          lenis.off("scroll", onScroll);
          lenis.destroy();
          ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
      },
    );

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "interactive") return;
    const root = rootRef.current;
    if (!root || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((element) => {
      const core = element.querySelector<HTMLElement>(".magnetic-core");
      if (!core) return;
      const move = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * 0.18;
        const y = (event.clientY - (rect.top + rect.height / 2)) * 0.22;
        core.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };
      const leave = () => {
        core.style.transform = "translate3d(0, 0, 0)";
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerleave", leave);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [phase]);

  const closeIndex = () => setIndexOpen(false);

  return (
    <main ref={rootRef} className="ronin-shell" data-phase={phase}>
      <div className="visual-world" aria-hidden="true">
        <div className="media-stage">
          <video
            ref={videoRef}
            className="samurai-video"
            src="/media/good.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
          <img
            ref={fallbackRef}
            className="veil-fallback"
            src="/media/image.png"
            alt=""
          />
          <canvas ref={canvasRef} className="liquid-veil" />
        </div>
        <div className="readability-wash" />
        <div className="ambient-light" />
        <div className="vignette" />
        <div className="grain" />
      </div>

      <div
        ref={loaderRef}
        className="cinematic-loader"
        role="progressbar"
        aria-label="Preparing the RONIN experience"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className="loader-mist mist-one" />
        <div className="loader-mist mist-two" />
        <div className="loader-emblem">
          <svg className="loader-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="loader-track" cx="60" cy="60" r="52" />
            <circle
              ref={loaderRingRef}
              className="loader-progress"
              cx="60"
              cy="60"
              r="52"
            />
          </svg>
          <span className="loader-orbit" />
          <span ref={loaderValueRef} className="loader-value">00</span>
          <span className="loader-seal">浪</span>
        </div>
        <div className="loader-caption">A FILM YOU CAN TOUCH</div>
      </div>

      <header className="site-header" aria-label="Primary navigation">
        <a href="#origin" className="wordmark hover-line" data-cursor="link" data-cursor-label="TOP">
          <span className="wordmark-mark" />
          RONIN
        </a>
        <div className="edition">A STUDY OF THE UNSEEN&nbsp; / &nbsp;侍</div>
        <button
          className="index-button hover-line"
          type="button"
          aria-expanded={indexOpen}
          aria-controls="chapter-index"
          onClick={() => setIndexOpen((open) => !open)}
          data-cursor="menu"
          data-cursor-label={indexOpen ? "CLOSE" : "INDEX"}
        >
          <span className="index-button-label">{indexOpen ? "CLOSE" : "INDEX"}</span>
          <span>01—05</span>
        </button>
      </header>

      <aside
        id="chapter-index"
        className={`index-panel ${indexOpen ? "is-open" : ""}`}
        aria-hidden={!indexOpen}
      >
        <div className="index-panel-wash" />
        <div className="index-panel-inner">
          <span className="index-eyebrow">CHAPTER INDEX / 章</span>
          <nav aria-label="Story chapters">
            {chapters.map((chapter) => (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                onClick={closeIndex}
                tabIndex={indexOpen ? 0 : -1}
                data-cursor="link"
                data-cursor-label="GO"
              >
                <span>{chapter.number}</span>
                <strong>{chapter.title}</strong>
                <em>{chapter.japanese}</em>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="story-world">
        <section className="story-section story-origin" id="origin" data-story>
          <div className="story-inner hero-inner">
            <div className="story-kicker" data-kicker data-motion>
              <span>01</span>
              <span>武士道 / BUSHIDŌ</span>
            </div>
            <h1 data-title data-cursor="heading" data-cursor-label="VIEW" data-motion>
              <span className="title-line" data-line>WAY OF</span>
              <span className="title-line serif-line" data-line>THE WARRIOR</span>
            </h1>
            <p className="story-copy hero-copy" data-copy data-motion>
              Before the blade is drawn,<br />
              the self is conquered.
            </p>
            <div className="reveal-instruction" data-instruction>
              <span className="instruction-line" />
              Move to uncover the living world
            </div>
          </div>
        </section>

        <section className="story-section story-honor" id="honor" data-story>
          <div className="story-inner split-composition">
            <div className="story-kicker" data-motion>
              <span>02</span>
              <span>名誉 / MEIYO</span>
            </div>
            <h2 data-title data-cursor="heading" data-cursor-label="LOOK" data-motion>
              <span className="line-mask"><span data-line>HONOR</span></span>
              <span className="line-mask"><span className="serif-line" data-line>WITHOUT FEAR</span></span>
            </h2>
            <p className="story-copy" data-copy data-motion>
              Stand where fear ends.<br />
              Let action carry the name.
            </p>
            <span className="chapter-whisper">A name survives only through the way it is carried.</span>
          </div>
        </section>

        <section className="story-section story-discipline" id="discipline" data-story>
          <div className="story-inner depth-composition">
            <div className="story-kicker" data-motion>
              <span>03</span>
              <span>鍛錬 / TANREN</span>
            </div>
            <h2 data-title data-cursor="heading" data-cursor-label="HOLD" data-motion>
              <span className="title-line" data-line>DISCIPLINE</span>
              <span className="title-line serif-line" data-line>IS POWER</span>
            </h2>
            <div className="discipline-rule" aria-hidden="true"><span /></div>
            <p className="story-copy" data-copy data-motion>
              Every repetition removes<br />
              what does not belong.
            </p>
          </div>
        </section>

        <section className="story-section story-silence" id="silence" data-story>
          <div className="story-inner silence-composition">
            <span className="vertical-kanji" aria-hidden="true">静寂</span>
            <div className="silence-copy-block">
              <div className="story-kicker" data-motion>
                <span>04</span>
                <span>SEIJAKU / STILLNESS</span>
              </div>
              <h2 data-title data-cursor="heading" data-cursor-label="LISTEN" data-motion>
                <span className="title-line" data-line>MASTER</span>
                <span className="title-line serif-line" data-line>THE SILENCE</span>
              </h2>
              <p className="story-copy" data-copy data-motion>
                In stillness, even the unseen<br />
                reveals its shape.
              </p>
            </div>
          </div>
        </section>

        <section className="story-section story-path" id="path" data-story>
          <div className="story-inner final-composition">
            <span className="final-kanji" aria-hidden="true">道</span>
            <div className="story-kicker" data-motion>
              <span>05</span>
              <span>THE WAY / 道</span>
            </div>
            <h2 data-title data-cursor="heading" data-cursor-label="BEYOND" data-motion>
              <span className="line-mask"><span data-line>THE PATH</span></span>
              <span className="line-mask"><span className="serif-line" data-line>NEVER ENDS.</span></span>
            </h2>
            <p className="story-copy final-copy" data-copy data-motion>
              The horizon is not an ending.<br />
              It is an invitation.
            </p>
            <a
              href="#origin"
              className="final-cta"
              data-magnetic
              data-cursor="cta"
              data-cursor-label="ENTER"
            >
              <span className="magnetic-core">
                <span>ENTER THE UNKNOWN</span>
                <i aria-hidden="true">↗</i>
              </span>
            </a>
            <div className="end-credit">RONIN / AN INTERACTIVE FILM / MMXXVI</div>
          </div>
        </section>
      </div>

      <nav className="chapter-rail" aria-label="Chapter progress">
        {chapters.map((chapter, index) => (
          <a
            key={chapter.id}
            className={activeChapter === index ? "active" : ""}
            href={`#${chapter.id}`}
            aria-label={`Chapter ${chapter.number}: ${chapter.title}`}
            aria-current={activeChapter === index ? "step" : undefined}
            data-cursor="link"
          >
            {chapter.number}
          </a>
        ))}
      </nav>

      <div className="scroll-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>

      <div ref={cursorRef} className="liquid-cursor" aria-hidden="true">
        <span ref={cursorLabelRef} className="cursor-label" />
      </div>
      <div ref={cursorDotRef} className="cursor-dot" aria-hidden="true" />
    </main>
  );
}
