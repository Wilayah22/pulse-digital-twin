"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../../i18n/LanguageProvider";
import { useSimulation } from "../../state/SimulationProvider";
import { ReportDocument } from "./ReportDocument";

/** Time for the off-screen charts to measure and finish their entry animation before printing. */
const RENDER_WAIT_MS = 1400;

/**
 * Renders the A4 report off screen, then opens the browser's print dialog, where "Save as PDF"
 * produces a vector PDF with real, selectable Arabic/English text.
 */
export function ReportButton() {
  const { result, activePreset } = useSimulation();
  const { t } = useLang();
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!preparing) return;
    const done = () => setPreparing(false);
    window.addEventListener("afterprint", done);
    const timer = setTimeout(() => window.print(), RENDER_WAIT_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [preparing]);

  if (!result) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setPreparing(true)}
        disabled={preparing}
        title={t("يفتح نافذة الطباعة — اختر «حفظ بتنسيق PDF»", "Opens the print dialog. Choose “Save as PDF”.")}
        className="flex items-center gap-1.5 rounded-lg bg-pn-forest px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#125a43] disabled:opacity-70"
      >
        {preparing ? <LoaderCircle size={13} className="animate-spin" /> : <FileDown size={13} />}
        {preparing ? t("جارٍ تجهيز التقرير…", "Preparing report…") : t("تقرير PDF", "PDF report")}
      </button>
      {preparing &&
        createPortal(
          <div id="pulse-report-root">
            <ReportDocument result={result} activePreset={activePreset} />
          </div>,
          document.body,
        )}
    </>
  );
}
