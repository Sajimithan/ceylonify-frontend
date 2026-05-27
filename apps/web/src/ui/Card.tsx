import React from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col min-w-0 break-words bg-white w-full shadow-lg rounded ${className} ${onClick ? "cursor-pointer hover:shadow-xl transition-shadow duration-150" : ""}`}
      onClick={onClick}
    >
      <div className="flex-auto p-4">{children}</div>
    </div>
  );
}
