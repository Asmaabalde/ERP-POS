import {useState} from "react";
import {X, Send} from "lucide-react";
import {envoyerEmailClient} from "../utils/api";

export function CRMEmailModal({isOpen, onClose, client, showToast}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSend = async () => {
    try {
      await envoyerEmailClient(client.id, {
        sujet: subject,
        message: message,
      });

      showToast("Email envoyé avec succès !");
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'envoi", "error");
    }
  };


  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose}/>

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-[#1E293B] mb-1">Envoyer un email</h2>
              <p className="text-sm text-[#64748B]">À : {client.email}</p>
            </div>
            <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#64748B]"/>
            </button>
          </div>

          {/* FORM */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="mb-4">
              <label className="block text-[#1E293B] mb-2">Objet</label>
              <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[#1E293B] mb-2">Message</label>
              <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-lg resize-none"
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-white border border-[#E2E8F0]"
            >
              Annuler
            </button>
            <button
                type="button"
                onClick={handleSend}
                disabled={!subject || !message}
                className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white"
            >
              <Send className="w-4 h-4"/>
              Envoyer
            </button>
          </div>
        </div>
      </div>
  );
}
