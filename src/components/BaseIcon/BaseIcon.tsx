import type { ReactNode, SVGProps } from "react";

type BaseIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  viewBox: string;
  children: ReactNode;
};

export function BaseIcon({
  size = 20,
  color = "currentColor",
  viewBox,
  children,
  style,
  ...props
}: BaseIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      style={{ color, display: "inline-block", flexShrink: 0, ...style }}
      {...props}
    >
      {children}
    </svg>
  );
}
