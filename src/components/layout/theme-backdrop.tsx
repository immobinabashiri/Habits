// The decorative layer behind the whole app, rendered once from the root layout.
// Each theme's CSS decides what shows (src/styles/backdrop.css), so this needs no
// client JavaScript and there is nothing to swap when the theme changes.

const CHARMS = [
  { shape: "star", tone: "charm-butter charm-optional", style: { top: "9%", left: "5%", width: 34, animationDelay: "0s" } },
  { shape: "heart", tone: "charm-pink", style: { top: "22%", right: "6%", width: 30, animationDelay: "-2s" } },
  { shape: "cloud", tone: "charm-cloud charm-optional", style: { top: "6%", right: "20%", width: 92, animationDelay: "-4s" } },
  { shape: "sparkle", tone: "charm-lilac", style: { top: "48%", left: "3%", width: 26, animationDelay: "-1s" } },
  { shape: "heart", tone: "charm-mint charm-optional", style: { top: "64%", right: "4%", width: 34, animationDelay: "-5s" } },
  { shape: "cloud", tone: "charm-cloud charm-optional", style: { bottom: "9%", left: "9%", width: 112, animationDelay: "-3s" } },
  { shape: "star", tone: "charm-pink charm-optional", style: { bottom: "20%", right: "22%", width: 24, animationDelay: "-6s" } },
  { shape: "sparkle", tone: "charm-butter", style: { bottom: "5%", right: "7%", width: 32, animationDelay: "-2.5s" } },
] as const;

const SHAPES = {
  star: { viewBox: "0 0 24 24", d: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" },
  heart: { viewBox: "0 0 24 24", d: "M12 21s-8.5-5.2-8.5-11.4A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 3C20.500 15.800 12 21 12 21z" },
  sparkle: { viewBox: "0 0 24 24", d: "M12 2c1 6 3.500 8.800 10 10-6.500 1.200-9 4-10 10-1-6-3.500-8.800-10-10 6.500-1.200 9-4 10-10z" },
  cloud: { viewBox: "0 0 64 36", d: "M18 34a13 13 0 0 1-2-25.800A16 16 0 0 1 46 11a11.500 11.500 0 0 1 1 23z" },
} as const;

export function ThemeBackdrop() {
  return (
    <div aria-hidden="true" className="page-backdrop">
      <div className="backdrop-waves">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <svg className="wave-c" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path className="fill-wave-3" d="M0 0h1440v150c-180 70-360 90-560 40S520 90 330 150 90 230 0 180z" />
        </svg>
        <svg className="wave-a" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path className="fill-wave-1" d="M0 120c160-70 340-90 540-30s360 110 540 60 280-90 360-70v240H0z" />
        </svg>
        <svg className="wave-b" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path className="fill-wave-2" d="M0 190c200 60 380 50 600-10s420-60 840 30v110H0z" />
        </svg>
      </div>

      <div className="backdrop-charms">
        {CHARMS.map(({ shape, tone, style }, index) => (
          <svg key={index} className={tone} viewBox={SHAPES[shape].viewBox} style={style} fill="currentColor">
            <path d={SHAPES[shape].d} />
          </svg>
        ))}
      </div>
    </div>
  );
}
