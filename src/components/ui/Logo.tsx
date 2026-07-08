import Image from "next/image";

interface LogoProps {
  withWordmark?: boolean;
  size?: number;
}

export function Logo({ withWordmark = false, size = 56 }: LogoProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/vela-logo.png"
        alt="Vela"
        width={size}
        height={size}
        priority
        style={{ width: size, height: "auto" }}
      />
      {withWordmark && (
        <span className="font-display text-2xl font-normal lowercase text-primary">
          vela
        </span>
      )}
    </div>
  );
}
