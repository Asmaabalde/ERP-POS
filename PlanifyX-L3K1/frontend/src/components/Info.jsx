export function Info({ label, icon, value }) {
  return (
    <div>
      <div className="text-[#64748B] text-sm mb-1">{label}</div>
      <div className="flex items-center gap-3 text-[#1E293B]">
        {icon && <div className="w-5 h-5 text-[#64748B]">{icon}</div>}
          <span className="text-sm">
            {value && value !== "" ? value : "Non renseigné"}
          </span>
      </div>
    </div>
  );
}
