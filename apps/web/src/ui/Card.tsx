import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col min-w-0 break-words bg-white w-full shadow-lg rounded ${className}`}
    >
      <div className="flex-auto p-4">{children}</div>
    </div>
  );
}
