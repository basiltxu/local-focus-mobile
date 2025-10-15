"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function Logo2({ className }: { className?: string }) {
  const { theme } = useTheme();

  // Choose the appropriate logo based on the current theme
  const logoSrc =
    theme === "dark"
      ? "/assets/localfocus-logo2-white.png"
      : "/assets/localfocus-logo2.png";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-[112px] h-auto",
        className
      )}
    >
      <Image
        src={logoSrc}
        alt="Local Focus Logo"
        width={112}
        height={49}
        priority
        className="object-contain max-w-full h-auto select-none transition-all duration-300"
        style={{
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}
