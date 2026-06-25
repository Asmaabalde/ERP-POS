import { Info } from "lucide-react";

export function Input({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  error,
  tooltip,
  readOnly,
}) {
    return (
        <div className="mb-3">
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium mb-1 flex items-center gap-1"
                >
                    {label}
                    {required && <span className="text-red-500">*</span>}

                    {tooltip && (
                        <span className="relative group inline-block">
      <Info className="w-4 h-4 text-slate-400 cursor-pointer"/>

      <span className="absolute left-1/2 -translate-x-1/2 -top-10 opacity-0
                        group-hover:opacity-100 transition bg-slate-800 text-white
                        text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-lg">
        {tooltip}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2
                          bg-slate-800 rotate-45"></span>
      </span>
    </span>
                    )}
                </label>

            )}

            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                readOnly={readOnly}
                className={`w-full border px-4 py-2 rounded-xl focus:outline-none 
          ${
                    error
                        ? "border-red-500 focus:ring-2 focus:ring-red-500"
                        : "border-slate-300 focus:ring-2 focus:ring-blue-500"
                }`}
            />

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
