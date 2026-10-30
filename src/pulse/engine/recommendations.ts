// Turns simulation results into explained recommendations. Every statement is derived from computed values;
// nothing is emitted unless the numbers support it.

import { IRRIGATION_TRIGGER } from "./constants";
import type { BasinId, CropParams, Recommendation, SimulationResult } from "./types";

type Partial = Omit<SimulationResult, "recommendations">;
interface Flags {
  rationedDays: number[];
  leachingWithheldDays: number[];
  leachingDays: number[];
  leachingRainDays: number[];
  rainLeachBasins: BasinId[];
  rainDrainage: number;
  withheldBasins: BasinId[];
  withheldBySupply: boolean;
  /** Pulse run with leaching disabled, for quoting the effect of leaching. */
  noLeaching: SimulationResult["pulse"];
}

const f = (n: number, digits = 1) => n.toFixed(digits).replace(/\.0+$/, "");

export function buildRecommendations(r: Partial, flags: Flags, crop: CropParams): Recommendation[] {
  const recs: Recommendation[] = [];
  const pulse = r.pulse;
  const day1 = pulse.basins.map((b) => ({ basin: b, d: b.days[0] }));
  const ranked = [...day1].sort((a, b) => b.d.priorityScore - a.d.priorityScore);
  const top = ranked.find((x) => x.d.irrigationVolume > 1e-6);

  if (top) {
    const { basin, d } = top;
    const pct = (100 * d.depletionBefore) / basin.taw;
    const salty = d.eceEnd > crop.eceThreshold || basin.initial.ece > crop.eceThreshold;
    recs.push({
      id: `priority-${basin.id}`,
      kind: "priority",
      basin: basin.id,
      severity: d.priority === "critical" ? "critical" : "warning",
      action: `أعطِ الأولوية للحوض ${basin.id}`,
      reason:
        `استنزاف ماء التربة في منطقة الجذور ${f(d.depletionBefore)} مم (${f(pct, 0)}% من الماء المتاح الكلي)، وهو الأعلى بين الأحواض` +
        (salty ? `، مع ملوحة تربة ECe ${f(basin.initial.ece)} dS/m فوق حد تحمّل النخيل (${f(crop.eceThreshold)}).` : "."),
      allocation: `${f(d.irrigationVolume)} م³ اليوم · ${f(basin.totalIrrigation)} م³ خلال الفترة`,
      impact: `ترتفع الرطوبة من ${f(d.moistureBefore, 0)}% إلى ${f(d.moistureAfter, 0)}% من الماء المتاح.`,
    });
  }

  for (const { basin, d } of ranked) {
    if (top && basin.id === top.basin.id) continue;
    if (d.irrigationVolume <= 1e-6 && d.requestVolume <= 1e-6) {
      const next = basin.days.find((x) => x.irrigationVolume > 1e-6);
      recs.push({
        id: `defer-${basin.id}`,
        kind: "defer",
        basin: basin.id,
        severity: "success",
        action: `أجّل ري الحوض ${basin.id}`,
        reason: `تبقّى ${f(d.moistureBefore, 0)}% من الماء المتاح؛ الاستنزاف ${f(d.depletionBefore)} مم أقل من حد التشغيل ${f(IRRIGATION_TRIGGER * basin.raw)} مم.`,
        allocation: "0 م³ اليوم",
        impact: next ? `أول ري متوقع في اليوم ${next.day} بكمية ${f(next.irrigationVolume)} م³.` : "لا يحتاج إلى ري خلال فترة المحاكاة.",
      });
    } else if (d.irrigationVolume + 1e-6 < d.requestVolume) {
      recs.push({
        id: `limit-${basin.id}`,
        kind: "limit",
        basin: basin.id,
        severity: "warning",
        action: `خصّص كمية محدودة للحوض ${basin.id}`,
        reason: `مخزون الخزان اليوم ${f(pulse.dailyStock[0])} م³ أقل من مجموع الطلبات ${f(day1.reduce((a, x) => a + x.d.requestVolume, 0))} م³، فوُزّعت المياه حسب الأولوية (${f(d.priorityScore * 100, 0)}/100).`,
        allocation: `${f(d.irrigationVolume)} من ${f(d.requestVolume)} م³ مطلوبة`,
        impact: `الرطوبة بعد الري ${f(d.moistureAfter, 0)}% بدلاً من 100%.`,
      });
    } else if (d.irrigationVolume > 1e-6) {
      recs.push({
        id: `irrigate-${basin.id}`,
        kind: "priority",
        basin: basin.id,
        severity: "info",
        action: `اروِ الحوض ${basin.id} حتى السعة الحقلية`,
        reason: `الاستنزاف ${f(d.depletionBefore)} مم تجاوز حد التشغيل ${f(IRRIGATION_TRIGGER * basin.raw)} مم.`,
        allocation: `${f(d.irrigationVolume)} م³ اليوم`,
        impact: `ترتفع الرطوبة من ${f(d.moistureBefore, 0)}% إلى ${f(d.moistureAfter, 0)}%.`,
      });
    }
  }

  // Rationing across the period (beyond day 1).
  const laterRationing = flags.rationedDays.filter((d) => d > 1);
  if (laterRationing.length > 0 && !recs.some((x) => x.kind === "limit")) {
    recs.push({
      id: "rationing",
      kind: "limit",
      severity: "warning",
      action: "قنّن التوزيع في الأيام القادمة",
      reason: `المخزون المتوقع لا يغطي الاحتياج المتوقع في الأيام ${laterRationing.join("، ")}؛ تُوزَّع المياه حسب الأولوية.`,
      allocation: `${f(pulse.totalUsed)} م³ من ${f(r.totalDelivered)} م³ متاحة`,
      impact: `أيام الإجهاد المائي: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} مع الري التقليدي.`,
    });
  }

  // Evapotranspiration trend.
  const et0 = r.weather.days.map((d) => d.et0);
  const peakIdx = et0.indexOf(Math.max(...et0));
  if (et0[0] > 0 && et0[peakIdx] >= 1.15 * et0[0]) {
    recs.push({
      id: "et0-peak",
      kind: "schedule",
      severity: "warning",
      action: `اضبط جدولة الري قبل اليوم ${peakIdx + 1}`,
      reason: `يرتفع ET0 من ${f(et0[0], 1)} إلى ${f(et0[peakIdx], 1)} مم/يوم (+${f((100 * (et0[peakIdx] - et0[0])) / et0[0], 0)}%).`,
      allocation: `ETc المتوقع ${f(et0[peakIdx] * crop.kc, 1)} مم/يوم (Kc = ${f(crop.kc, 2)})`,
      impact: "يُقدَّم ري الأحواض الأقرب لحد الإجهاد لتفادي نقص الرطوبة في ذروة الطلب.",
    });
  } else {
    const mean = et0.reduce((a, b) => a + b, 0) / et0.length;
    if (mean >= 8) {
      recs.push({
        id: "et0-high",
        kind: "schedule",
        severity: "warning",
        action: "طلب تبخر-نتح مرتفع طوال الفترة",
        reason: `متوسط ET0 ${f(mean, 1)} مم/يوم؛ تُستنزف التربة أسرع فتتقارب فترات الري.`,
        allocation: `ETc ≈ ${f(mean * crop.kc, 1)} مم/يوم لكل حوض`,
        impact: "تُراجع الأولويات يومياً بدلاً من جدول ثابت.",
      });
    }
  }

  // Rain: report effective rainfall and how Pulse cut irrigation on those days.
  const rainDays = pulse.basins[0].days.filter((d) => d.effectiveRain > 0);
  if (rainDays.length > 0) {
    const effective = rainDays.reduce((acc, d) => acc + d.effectiveRain, 0);
    const etcTotal = pulse.basins[0].days.reduce((acc, d) => acc + d.etc, 0);
    const first = rainDays[0].day;
    const usedFrom = pulse.dailyUse.slice(first - 1).reduce((a, b) => a + b, 0);
    const tradFrom = r.traditional.dailyUse.slice(first - 1).reduce((a, b) => a + b, 0);
    recs.push({
      id: "rain",
      kind: "rain",
      severity: "info",
      action: `قلّل الري مع أمطار اليوم ${rainDays.map((d) => d.day).join(" و")}`,
      reason: `يُتوقع ${f(rainDays.reduce((acc, d) => acc + r.weather.days[d.day - 1].rain, 0))} مم أمطار، منها ${f(effective)} مم فعّالة تصل منطقة الجذور وتعوّض جزءاً من الاستنزاف.`,
      allocation: `${f(usedFrom)} م³ من اليوم ${first} حتى النهاية مقابل ${f(tradFrom)} م³ تقليدياً`,
      impact: `المطر الفعّال يغطي ${f((100 * effective) / Math.max(1e-9, etcTotal), 0)}% من احتياج النخيل ETc خلال الفترة.`,
    });
  }

  // Leaching: only when salinity exceeds the crop threshold AND water allows it.
  if (flags.leachingDays.length > 0) {
    const leached = pulse.basins.filter((b) => b.totalLeaching > 1e-6);
    const total = leached.reduce((a, b) => a + b.totalLeaching, 0);
    recs.push({
      id: "leaching",
      kind: "leaching",
      severity: "info",
      action: `نفّذ غسيل أملاح للحوض ${leached.map((b) => b.id).join(" و")}`,
      reason: `ECe ${leached.map((b) => `${b.id}: ${f(b.initial.ece)}`).join("، ")} dS/m أعلى من حد تحمّل النخيل ${f(crop.eceThreshold)}؛ متطلب الغسيل LR = ${f(r.leachingRequirement * 100, 0)}% عند ECw ${f(r.inputs.ecw)} dS/m.`,
      allocation: `${f(total)} م³ إضافية للغسيل`,
      impact:
        "ECe نهاية الفترة: " +
        leached
          .map((b) => {
            const without = flags.noLeaching.basins.find((x) => x.id === b.id)!;
            return `${b.id} ${f(b.days[b.days.length - 1].eceEnd, 2)} مقابل ${f(without.days[without.days.length - 1].eceEnd, 2)} دون غسيل`;
          })
          .join(" · ") +
        ` (اليوم ${flags.leachingDays.join("، ")})`,
    });
  }
  if (flags.leachingRainDays.length > 0) {
    const ids = flags.rainLeachBasins;
    const basins = pulse.basins.filter((b) => ids.includes(b.id));
    const rainDays = pulse.basins[0].days.filter((d) => d.effectiveRain > 0).map((d) => d.day);
    recs.push({
      id: "leaching-rain",
      kind: "leaching",
      severity: "success",
      action: `أجّل غسيل الأملاح للحوض ${ids.join(" و")} — المطر سيقوم به`,
      reason: `ملوحة التربة فوق حد التحمّل (${basins.map((b) => `${b.id}: ${f(b.initial.ece)}`).join("، ")} dS/m)، لكن يُتوقع أن يتسرب نحو ${f(flags.rainDrainage, 0)} مم من مياه أمطار اليوم ${rainDays.join(" و")} تحت منطقة الجذور، وهي مياه عذبة تغسل الأملاح دون استهلاك مياه الخزان.`,
      allocation: "0 م³ من الخزان للغسيل",
      impact:
        "ECe قبل المطر ← نهاية الفترة: " +
        basins
          .map((b) => {
            const before = rainDays[0] > 1 ? b.days[rainDays[0] - 2].eceEnd : b.initial.ece;
            return `${b.id} ${f(before, 2)} ← ${f(b.days[b.days.length - 1].eceEnd, 2)}`;
          })
          .join(" · ") +
        " dS/m",
    });
  }
  // A basin counts as withheld only if neither rain nor actual leaching covered it later in the period.
  const leachedIds = pulse.basins.filter((b) => b.totalLeaching > 1e-6).map((b) => b.id);
  const withheld = flags.withheldBasins.filter((id) => !flags.rainLeachBasins.includes(id) && !leachedIds.includes(id));
  const rainExpected = pulse.basins[0].days.some((d) => d.effectiveRain > 0);
  if (withheld.length > 0) {
    recs.push({
      id: "no-leaching",
      kind: "no-leaching",
      basin: withheld.length === 1 ? withheld[0] : undefined,
      severity: "warning",
      action: `لا يُوصى بغسيل الحوض ${withheld.join(" و")} حالياً`,
      reason: flags.withheldBySupply
        ? `الملوحة فوق حد التحمّل، لكن المياه المتاحة خلال الفترة لا تكفي للري والغسيل معاً (LR = ${f(r.leachingRequirement * 100, 0)}%).`
        : `الملوحة فوق حد التحمّل، لكن مخزون الخزان في اليوم ${flags.leachingWithheldDays.join(" و")} لا يتّسع للري والغسيل معاً` +
          (rainExpected ? "؛ والتربة أجفّ من أن تصرف مياه المطر المتوقعة تحت الجذور." : "."),
      allocation: "تُوجَّه كل المياه لتلبية احتياج الري",
      impact: `ECe نهاية الفترة: ${pulse.basins
        .filter((b) => withheld.includes(b.id))
        .map((b) => `${b.id} ${f(b.initial.ece, 2)} ← ${f(b.days[b.days.length - 1].eceEnd, 2)}`)
        .join(" · ")} dS/m.`,
    });
  }

  if (r.inputs.delayHours > 0) {
    const extra = pulse.basins.map((b) => b.days[0].depletionBefore - b.initial.depletion);
    const maxExtra = Math.max(...extra);
    recs.push({
      id: "delay",
      kind: "delay",
      severity: "warning",
      action: `عوّض تأخر المناوبة ${r.inputs.delayHours} ساعات`,
      reason: `أثناء الانتظار تُستنزف حتى ${f(maxExtra)} مم إضافية؛ أُدرج هذا الاستنزاف في حساب الأولويات.`,
      allocation: `${f(r.timeline[0].delivered)} م³ في اليوم 1 و${f(r.timeline[1]?.delivered ?? 0)} م³ في اليوم 2`,
      impact: "تُقدَّم الأحواض الأكثر جفافاً عند وصول المياه.",
    });
  }

  if (r.inputs.outageFromDay > 0) {
    const reserveAtOutage = r.pulse.dailyUse
      .slice(0, r.inputs.outageFromDay - 1)
      .reduce((acc, used, i) => acc + r.timeline[i].delivered - used, 0);
    recs.push({
      id: "outage",
      kind: "outage",
      severity: "critical",
      action: "أدِر مخزون الخزان أثناء الانقطاع",
      reason: `يتوقف الإمداد من اليوم ${r.inputs.outageFromDay}؛ وصل ${f(r.totalDelivered)} م³ فقط من ${f(r.inputs.availableWater)} م³.`,
      allocation: `مخزون محفوظ عند الانقطاع: ${f(Math.max(0, reserveAtOutage))} م³`,
      impact: `أيام الإجهاد: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} تقليدياً.`,
    });
  }

  const saved = r.traditional.totalUsed - pulse.totalUsed;
  const pct = r.traditional.totalUsed > 0 ? (100 * saved) / r.traditional.totalUsed : 0;
  if (pct >= 1) {
    recs.push({
      id: "saving",
      kind: "saving",
      severity: "success",
      action: `وفّر ${f(saved)} م³ (${f(pct, 0)}%) مقارنة بالري التقليدي`,
      reason: `يمنع Pulse الري الزائد الذي يتسرب تحت منطقة الجذور (${f(totalDp(r.traditional) - totalDp(pulse), 0)} مم أقل من التسرب العميق).`,
      allocation: `${f(pulse.totalUsed)} م³ مقابل ${f(r.traditional.totalUsed)} م³`,
      impact: `يبقى ${f(pulse.reservoirEnd)} م³ في الخزان للمناوبة التالية.`,
    });
  } else if (pulse.stressDays < r.traditional.stressDays) {
    recs.push({
      id: "stress",
      kind: "saving",
      severity: "success",
      action: "وزّع المياه الشحيحة حسب الحاجة",
      reason: "المياه المتاحة لا تسمح بتوفير كبير، لكن توجيهها للأحواض الأكثر حاجة يقلل الإجهاد.",
      allocation: `${f(pulse.totalUsed)} م³ مستخدمة`,
      impact: `أيام الإجهاد: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} تقليدياً.`,
    });
  }

  return recs;
}

function totalDp(s: SimulationResult["pulse"]): number {
  return s.basins.reduce((a, b) => a + b.totalDeepPercolation, 0);
}
