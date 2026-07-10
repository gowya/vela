interface LogoProps {
  size?: number;
}

export function Logo({ size = 56 }: LogoProps) {
  const height = Math.round((size * 124) / 153);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/vela-logo-vin.svg"
        alt="Vela"
        width={size}
        height={height}
        className="dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/vela-logo-sable.svg"
        alt="Vela"
        width={size}
        height={height}
        className="hidden dark:block"
      />
    </>
  );
}
