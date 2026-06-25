import { useEffect, useRef, useState } from "react";

export function GlobalToast() {
  const [toast, setToast] = useState({ message: "", type: "" });
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleToast = (event) => {
      const { message = "", type = "success" } = event.detail || {};

      setToast({ message, type });

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setToast({ message: "", type: "" });
      }, 3000);
    };

    window.addEventListener("app-toast", handleToast);

    return () => {
      window.removeEventListener("app-toast", handleToast);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!toast.message) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-xl shadow-lg text-white ${
        toast.type === "success"
          ? "bg-green-600"
          : toast.type === "warning"
          ? "bg-amber-500"
          : "bg-red-600"
      }`}
    >
      {toast.message}
    </div>
  );
}