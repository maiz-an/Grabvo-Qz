interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <>
      <span
        className={`font-semibold tracking-tighter logo-font italic leading-none text-7xl text-black [text-shadow:2px_2px_2px_rgba(0,0,0,0.35)] ${className}`}
      >
        Grabvo
      </span>
    </>
  );
}
