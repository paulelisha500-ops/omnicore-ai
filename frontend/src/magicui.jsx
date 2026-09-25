/* ============================================================================
   Magic UI components (magicui.design) — MIT, adapted for this project.

   Two deliberate deviations from the upstream copy-paste versions:

   1. They ship as TypeScript + shadcn `cn()`. This project is plain JSX with
      no shadcn, so types are dropped and `cn` is a local clsx/tailwind-merge
      helper.
   2. Upstream assumes Tailwind's Preflight and shadcn design tokens
      (`bg-background`, `text-foreground`). Preflight is off here and the
      palette lives in this project's own CSS variables, so colours are wired
      to `var(--accent)`, `var(--ink)` etc. instead. That keeps one source of
      truth for theming and means these components follow the existing
      light/dark and EN/AR-RTL behaviour rather than fighting it.

   Everything is animation-only: no component here fetches, computes or
   invents data. NumberTicker animates toward a number it is handed.
   ============================================================================ */
import React, { useEffect, useRef, useState, useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from "motion/react";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ---------------------------------------------------------------------------
   NumberTicker — counts up to `value` when scrolled into view.
   Used for KPIs and the landing trust strip. The displayed figure always
   settles on exactly the value passed in; the animation is presentation only.
   --------------------------------------------------------------------------- */
export function NumberTicker({ value, direction = "up", delay = 0, decimalPlaces = 0, className, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const reduce = useReducedMotion();
  const fmt = (n) => Intl.NumberFormat("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(n);
  // With reduced motion the figure is shown at its final value from the first
  // paint — no count-up, and no "0" placeholder flash for a screen reader.
  const [display, setDisplay] = useState(reduce ? fmt(value) : "0");

  useEffect(() => {
    if (reduce) { setDisplay(fmt(value)); return; }
    if (!isInView) return;
    const timer = setTimeout(() => motionValue.set(direction === "down" ? 0 : value), delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, isInView, delay, value, direction, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        setDisplay(
          Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        );
      }),
    [springValue, decimalPlaces]
  );

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {prefix}{display}{suffix}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   BlurFade — reveals children with a blur + rise as they enter the viewport.
   --------------------------------------------------------------------------- */
export function BlurFade({ children, className, delay = 0, yOffset = 6, inViewMargin = "-40px", blur = "6px" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: inViewMargin });
  const reduce = useReducedMotion();
  // Reduced motion: render visible immediately. Besides respecting the OS
  // setting, this removes the failure mode where hero content stays at
  // opacity 0 until an IntersectionObserver/animation frame fires.
  if (reduce) return <div ref={ref} className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: `blur(${blur})` }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ delay: 0.04 + delay, duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
   BorderBeam — a light travelling around a container's border.
   The parent must be `position: relative` and clip overflow.
   --------------------------------------------------------------------------- */
export function BorderBeam({ size = 200, duration = 12, delay = 0, colorFrom = "#C81E33", colorTo = "#3A0A10", className }) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--anchor": 90,
        "--border-width": 1.5,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      }}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        "[border:calc(var(--border-width)*1px)_solid_transparent]",
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect]",
        "[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)]",
        "after:animate-border-beam after:[animation-delay:var(--delay)]",
        "after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
        "after:[offset-anchor:calc(var(--anchor)*1%)_50%]",
        "after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
    />
  );
}

/* ---------------------------------------------------------------------------
   ShimmerButton — CTA with a rotating conic highlight around the edge.
   --------------------------------------------------------------------------- */
export function ShimmerButton({
  shimmerColor = "#ffffff", shimmerSize = "0.05em", shimmerDuration = "3s",
  borderRadius = "12px", background = "var(--red, #C81E33)",
  className, children, ...props
}) {
  return (
    <button
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap",
        "[background:var(--bg)] [border-radius:var(--radius)] [border:1px_solid_rgba(255,255,255,0.1)]",
        "px-6 py-3 text-white font-semibold",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        className
      )}
      {...props}
    >
      {/* spark container */}
      <div className={cn("-z-30 blur-[2px]", "absolute inset-0 overflow-visible [container-type:size]")}>
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
          <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
        </div>
      </div>
      {children}
      {/* highlight on hover */}
      <div
        className={cn(
          "insert-0 absolute size-full",
          "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          "transform-gpu transition-all duration-300 ease-in-out",
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )}
      />
      {/* backdrop */}
      <div className={cn("absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]")} />
    </button>
  );
}

/* ---------------------------------------------------------------------------
   AnimatedGradientText — a pill with a slowly travelling gradient on the text.
   --------------------------------------------------------------------------- */
export function AnimatedGradientText({ children, className, from = "#C81E33", via = "#8C1023", to = "#3A0A10" }) {
  return (
    <div
      className={cn(
        "group relative mx-auto flex max-w-fit flex-row items-center justify-center gap-2",
        "rounded-2xl px-4 py-1.5 text-sm font-medium",
        "backdrop-blur-sm transition-shadow duration-500 ease-out",
        className
      )}
      style={{ background: "var(--red-soft, #F6DCDC)" }}
    >
      <span
        className="animate-gradient inline bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, ${from}, ${via}, ${to}, ${via}, ${from})`,
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
        }}
      >
        {children}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   DotPattern — a subtle SVG dot grid for section backgrounds.
   --------------------------------------------------------------------------- */
export function DotPattern({ width = 16, height = 16, cx = 1, cy = 1, cr = 1, className, ...props }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse" x={0} y={0}>
          <circle id="pattern-circle" cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Marquee — infinite horizontal scroller. `pauseOnHover` so a reader can stop
   it to actually read an item, which matters for the tech-stack strip.
   --------------------------------------------------------------------------- */
export function Marquee({ className, reverse = false, pauseOnHover = false, children, vertical = false, repeat = 4, ...props }) {
  return (
    <div
      {...props}
      // direction:ltr is deliberate. The keyframes translate toward the LEFT
      // (-100%), which only lines up with a flex row that starts on the left.
      // Under an RTL page the row starts on the right, so the track moved away
      // from its own content and opened an empty strip growing from ~180px to
      // ~690px of a 1052px row each cycle (QA-measured). A scrolling ticker has
      // no reading order of its own, so pinning it LTR is correct in both
      // languages; the entries are Latin proper nouns.
      style={{ "--duration": "40s", "--gap": "1rem", direction: "ltr", ...props.style }}
      className={cn(
        "group flex overflow-hidden p-2 [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
            "animate-marquee flex-row": !vertical,
            "animate-marquee-vertical flex-col": vertical,
            "group-hover:[animation-play-state:paused]": pauseOnHover,
            "[animation-direction:reverse]": reverse,
          })}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Ripple — concentric expanding circles, used behind the landing CTA band.
   --------------------------------------------------------------------------- */
export function Ripple({ mainCircleSize = 210, mainCircleOpacity = 0.22, numCircles = 6, className }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 select-none overflow-hidden", className)}>
      {Array.from({ length: numCircles }).map((_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = Math.max(mainCircleOpacity - i * 0.03, 0);
        return (
          <div
            key={i}
            className="absolute animate-ripple rounded-full border bg-white/10"
            style={{
              width: `${size}px`, height: `${size}px`, opacity,
              animationDelay: `${i * 0.06}s`,
              borderColor: `rgba(255,255,255,${0.18 + i * 0.02})`,
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              "--i": i,
            }}
          />
        );
      })}
    </div>
  );
}
