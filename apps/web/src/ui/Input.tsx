type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, className = "", ...props }: Props) {
  return (
    <label className="block">
      <div className="block uppercase text-slate-600 text-xs font-bold mb-2">
        {label}
      </div>
      <input
        className={`border-0 px-3 py-3 placeholder-slate-300 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 ${className}`}
        {...props}
      />
      {hint ? (
        <div className="mt-2 text-xs text-slate-400 font-semibold">{hint}</div>
      ) : null}
    </label>
  );
}
