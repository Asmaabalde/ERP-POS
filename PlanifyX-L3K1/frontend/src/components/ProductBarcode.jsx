import { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";

export function ProductBarcode({ value, compact = false, onClick }) {
    const [barcodeUrl, setBarcodeUrl] = useState(null);

    useEffect(() => {
        /**
         * Génère une image temporaire du code-barres à chaque fois
         * que la valeur ou le mode compact change.
         */
        if (!value) {
            setBarcodeUrl(null);
            return;
        }

        let url = null;

        try {
            const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");

            JsBarcode(svgNode, value, {
                format: "EAN13",
                displayValue: true,
                fontSize: compact ? 12 : 16,
                textMargin: compact ? 2 : 4,
                margin: compact ? 4 : 8,
                width: compact ? 1.2 : 2,
                height: compact ? 32 : 56,
                background: "#ffffff",
            });

            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgNode);
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            url = URL.createObjectURL(blob);

            setBarcodeUrl(url);
        } catch (error) {
            console.error("Erreur génération code-barres :", error);
            setBarcodeUrl(null);
        }

        return () => {
            /**
             * Libère l'URL créée pour éviter d'accumuler
             * des ressources inutiles en mémoire.
             */
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [value, compact]);

    if (!value || !barcodeUrl) return null;

    return (
        <div
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={(e) => {
                // Empêche le clic sur le code-barres de déclencher le clic du parent
                e.stopPropagation();
                onClick?.();
            }}
        >
            <div className="flex flex-col items-center justify-center">
                <img
                    src={barcodeUrl}
                    alt={`Code-barres ${value}`}
                    className="max-w-full h-auto mx-auto"
                    draggable={false}
                />
            </div>
        </div>
    );
}