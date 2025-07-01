import React from "react";
import clsx from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      className={clsx(
        "inline-block rounded px-2 py-0.5 text-xs font-semibold",
        variant === "primary" && "bg-blue-100 text-blue-800",
        variant === "secondary" && "bg-gray-200 text-gray-800",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}; 