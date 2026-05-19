import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  let styles =
    "font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 ";

  switch (variant) {
    case "primary":
      styles += "bg-sky-500 text-white active:bg-sky-600";
      break;
    case "secondary":
      styles += "bg-slate-800 text-white active:bg-slate-900";
      break;
    case "danger":
      styles += "bg-red-500 text-white active:bg-red-600";
      break;
    case "ghost":
      styles +=
        "bg-transparent text-slate-700 hover:bg-slate-100 shadow-none hover:shadow-none active:bg-slate-200 border border-transparent";
      break;
  }

  // If inside actions on dark background, ghost could be white
  if (variant === "ghost" && className.includes("text-white")) {
    styles = styles.replace("text-slate-700", "text-white").replace("hover:bg-slate-100", "hover:bg-white/10");
  }

  return (
    <button
      className={`${styles} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
