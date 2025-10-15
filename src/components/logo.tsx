import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
        src="/assets/localfocus-logo.png"
        alt="Local Focus Logo"
        width={180}
        height={80}
        priority
        style={{
          objectFit: "contain",
          backgroundColor: "transparent",
        }}
        className={cn(className)}
    />
  );
}
