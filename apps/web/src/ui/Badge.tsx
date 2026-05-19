export function Badge({ value }: { value: string }) {
  const color =
    value === "APPROVED"
      ? "text-emerald-600 bg-emerald-200"
      : value === "REJECTED"
      ? "text-red-600 bg-red-200"
      : "text-amber-600 bg-amber-200";

  return (
    <span
      className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded last:mr-0 mr-1 ${color}`}
    >
      {value}
    </span>
  );
}
