// Turns simulation results into explained recommendations. Every statement is derived from computed values;
// nothing is emitted unless the numbers support it.

import { IRRIGATION_TRIGGER } from "./constants";
import type { BasinId, CropParams, Lang, Recommendation, SimulationResult } from "./types";

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

export function buildRecommendations(r: Partial, flags: Flags, crop: CropParams, lang: Lang = "ar"): Recommendation[] {
  const en = lang === "en";
  const T = (ar: string, english: string) => (en ? english : ar);
  /** "A و B" / "A and B" */
  const and = (xs: (string | number)[]) => xs.join(T(" و", " and "));
  /** "3، 5" / "3, 5" */
  const list = (xs: (string | number)[]) => xs.join(T("، ", ", "));
  const arrow = T("←", "→");
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
      action: T(`أعطِ الأولوية للحوض ${basin.id}`, `Prioritise Basin ${basin.id}`),
      reason:
        T(
          `استنزاف ماء التربة في منطقة الجذور ${f(d.depletionBefore)} مم (${f(pct, 0)}% من الماء المتاح الكلي)، وهو الأعلى بين الأحواض`,
          `Root-zone depletion is ${f(d.depletionBefore)} mm (${f(pct, 0)}% of total available water), the highest of all basins`,
        ) +
        (salty
          ? T(
              `، مع ملوحة تربة ECe ${f(basin.initial.ece)} dS/m فوق حد تحمّل النخيل (${f(crop.eceThreshold)}).`,
              `, with soil salinity ECe ${f(basin.initial.ece)} dS/m above the date-palm tolerance (${f(crop.eceThreshold)}).`,
            )
          : "."),
      allocation: T(
        `${f(d.irrigationVolume)} م³ اليوم · ${f(basin.totalIrrigation)} م³ خلال الفترة`,
        `${f(d.irrigationVolume)} m³ today · ${f(basin.totalIrrigation)} m³ over the period`,
      ),
      impact: T(
        `ترتفع الرطوبة من ${f(d.moistureBefore, 0)}% إلى ${f(d.moistureAfter, 0)}% من الماء المتاح.`,
        `Moisture rises from ${f(d.moistureBefore, 0)}% to ${f(d.moistureAfter, 0)}% of available water.`,
      ),
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
        action: T(`أجّل ري الحوض ${basin.id}`, `Defer irrigation of Basin ${basin.id}`),
        reason: T(
          `تبقّى ${f(d.moistureBefore, 0)}% من الماء المتاح؛ الاستنزاف ${f(d.depletionBefore)} مم أقل من حد التشغيل ${f(IRRIGATION_TRIGGER * basin.raw)} مم.`,
          `${f(d.moistureBefore, 0)}% of available water remains; depletion of ${f(d.depletionBefore)} mm is below the ${f(IRRIGATION_TRIGGER * basin.raw)} mm trigger.`,
        ),
        allocation: T("0 م³ اليوم", "0 m³ today"),
        impact: next
          ? T(`أول ري متوقع في اليوم ${next.day} بكمية ${f(next.irrigationVolume)} م³.`, `Next irrigation expected on day ${next.day}: ${f(next.irrigationVolume)} m³.`)
          : T("لا يحتاج إلى ري خلال فترة المحاكاة.", "No irrigation needed during the simulated period."),
      });
    } else if (d.irrigationVolume + 1e-6 < d.requestVolume) {
      recs.push({
        id: `limit-${basin.id}`,
        kind: "limit",
        basin: basin.id,
        severity: "warning",
        action: T(`خصّص كمية محدودة للحوض ${basin.id}`, `Give Basin ${basin.id} a limited allocation`),
        reason: T(
          `مخزون الخزان اليوم ${f(pulse.dailyStock[0])} م³ أقل من مجموع الطلبات ${f(day1.reduce((a, x) => a + x.d.requestVolume, 0))} م³، فوُزّعت المياه حسب الأولوية (${f(d.priorityScore * 100, 0)}/100).`,
          `Today's reservoir stock of ${f(pulse.dailyStock[0])} m³ is below total requests of ${f(day1.reduce((a, x) => a + x.d.requestVolume, 0))} m³, so water is shared by priority (${f(d.priorityScore * 100, 0)}/100).`,
        ),
        allocation: T(`${f(d.irrigationVolume)} من ${f(d.requestVolume)} م³ مطلوبة`, `${f(d.irrigationVolume)} of ${f(d.requestVolume)} m³ requested`),
        impact: T(`الرطوبة بعد الري ${f(d.moistureAfter, 0)}% بدلاً من 100%.`, `Moisture after irrigation: ${f(d.moistureAfter, 0)}% instead of 100%.`),
      });
    } else if (d.irrigationVolume > 1e-6) {
      recs.push({
        id: `irrigate-${basin.id}`,
        kind: "priority",
        basin: basin.id,
        severity: "info",
        action: T(`اروِ الحوض ${basin.id} حتى السعة الحقلية`, `Irrigate Basin ${basin.id} to field capacity`),
        reason: T(
          `الاستنزاف ${f(d.depletionBefore)} مم تجاوز حد التشغيل ${f(IRRIGATION_TRIGGER * basin.raw)} مم.`,
          `Depletion of ${f(d.depletionBefore)} mm has passed the ${f(IRRIGATION_TRIGGER * basin.raw)} mm trigger.`,
        ),
        allocation: T(`${f(d.irrigationVolume)} م³ اليوم`, `${f(d.irrigationVolume)} m³ today`),
        impact: T(`ترتفع الرطوبة من ${f(d.moistureBefore, 0)}% إلى ${f(d.moistureAfter, 0)}%.`, `Moisture rises from ${f(d.moistureBefore, 0)}% to ${f(d.moistureAfter, 0)}%.`),
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
      action: T("قنّن التوزيع في الأيام القادمة", "Ration water over the coming days"),
      reason: T(
        `المخزون المتوقع لا يغطي الاحتياج المتوقع في الأيام ${list(laterRationing)}؛ تُوزَّع المياه حسب الأولوية.`,
        `Expected stock does not cover forecast demand on days ${list(laterRationing)}; water is shared by priority.`,
      ),
      allocation: T(`${f(pulse.totalUsed)} م³ من ${f(r.totalDelivered)} م³ متاحة`, `${f(pulse.totalUsed)} of ${f(r.totalDelivered)} m³ available`),
      impact: T(
        `أيام الإجهاد المائي: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} مع الري التقليدي.`,
        `Water-stress days: ${pulse.stressDays} with Pulse vs ${r.traditional.stressDays} with traditional irrigation.`,
      ),
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
      action: T(`اضبط جدولة الري قبل اليوم ${peakIdx + 1}`, `Adjust the schedule before day ${peakIdx + 1}`),
      reason: T(
        `يرتفع ET0 من ${f(et0[0], 1)} إلى ${f(et0[peakIdx], 1)} مم/يوم (+${f((100 * (et0[peakIdx] - et0[0])) / et0[0], 0)}%).`,
        `ET0 rises from ${f(et0[0], 1)} to ${f(et0[peakIdx], 1)} mm/day (+${f((100 * (et0[peakIdx] - et0[0])) / et0[0], 0)}%).`,
      ),
      allocation: T(
        `ETc المتوقع ${f(et0[peakIdx] * crop.kc, 1)} مم/يوم (Kc = ${f(crop.kc, 2)})`,
        `Expected ETc ${f(et0[peakIdx] * crop.kc, 1)} mm/day (Kc = ${f(crop.kc, 2)})`,
      ),
      impact: T(
        "يُقدَّم ري الأحواض الأقرب لحد الإجهاد لتفادي نقص الرطوبة في ذروة الطلب.",
        "Basins closest to stress are irrigated earlier to avoid a moisture deficit at peak demand.",
      ),
    });
  } else {
    const mean = et0.reduce((a, b) => a + b, 0) / et0.length;
    if (mean >= 8) {
      recs.push({
        id: "et0-high",
        kind: "schedule",
        severity: "warning",
        action: T("طلب تبخر-نتح مرتفع طوال الفترة", "High evaporative demand all period"),
        reason: T(
          `متوسط ET0 ${f(mean, 1)} مم/يوم؛ تُستنزف التربة أسرع فتتقارب فترات الري.`,
          `Mean ET0 is ${f(mean, 1)} mm/day; soils dry faster, so irrigation intervals shorten.`,
        ),
        allocation: T(`ETc ≈ ${f(mean * crop.kc, 1)} مم/يوم لكل حوض`, `ETc ≈ ${f(mean * crop.kc, 1)} mm/day per basin`),
        impact: T("تُراجع الأولويات يومياً بدلاً من جدول ثابت.", "Priorities are re-evaluated daily instead of following a fixed schedule."),
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
      action: T(`قلّل الري مع أمطار اليوم ${and(rainDays.map((d) => d.day))}`, `Cut irrigation for rain on day ${and(rainDays.map((d) => d.day))}`),
      reason: T(
        `يُتوقع ${f(rainDays.reduce((acc, d) => acc + r.weather.days[d.day - 1].rain, 0))} مم أمطار، منها ${f(effective)} مم فعّالة تصل منطقة الجذور وتعوّض جزءاً من الاستنزاف.`,
        `${f(rainDays.reduce((acc, d) => acc + r.weather.days[d.day - 1].rain, 0))} mm of rain is forecast, ${f(effective)} mm of it effective, reaching the root zone and offsetting depletion.`,
      ),
      allocation: T(
        `${f(usedFrom)} م³ من اليوم ${first} حتى النهاية مقابل ${f(tradFrom)} م³ تقليدياً`,
        `${f(usedFrom)} m³ from day ${first} to the end vs ${f(tradFrom)} m³ traditionally`,
      ),
      impact: T(
        `المطر الفعّال يغطي ${f((100 * effective) / Math.max(1e-9, etcTotal), 0)}% من احتياج النخيل ETc خلال الفترة.`,
        `Effective rain covers ${f((100 * effective) / Math.max(1e-9, etcTotal), 0)}% of the palms' ETc over the period.`,
      ),
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
      action: T(`نفّذ غسيل أملاح للحوض ${and(leached.map((b) => b.id))}`, `Leach salts in Basin ${and(leached.map((b) => b.id))}`),
      reason: T(
        `ECe ${list(leached.map((b) => `${b.id}: ${f(b.initial.ece)}`))} dS/m أعلى من حد تحمّل النخيل ${f(crop.eceThreshold)}؛ متطلب الغسيل LR = ${f(r.leachingRequirement * 100, 0)}% عند ECw ${f(r.inputs.ecw)} dS/m.`,
        `ECe ${list(leached.map((b) => `${b.id}: ${f(b.initial.ece)}`))} dS/m exceeds the date-palm tolerance of ${f(crop.eceThreshold)}; leaching requirement LR = ${f(r.leachingRequirement * 100, 0)}% at ECw ${f(r.inputs.ecw)} dS/m.`,
      ),
      allocation: T(`${f(total)} م³ إضافية للغسيل`, `${f(total)} m³ extra for leaching`),
      impact:
        T("ECe نهاية الفترة: ", "End-of-period ECe: ") +
        leached
          .map((b) => {
            const without = flags.noLeaching.basins.find((x) => x.id === b.id)!;
            const w = f(b.days[b.days.length - 1].eceEnd, 2);
            const wo = f(without.days[without.days.length - 1].eceEnd, 2);
            return T(`${b.id} ${w} مقابل ${wo} دون غسيل`, `${b.id} ${w} vs ${wo} without leaching`);
          })
          .join(" · ") +
        T(` (اليوم ${list(flags.leachingDays)})`, ` (day ${list(flags.leachingDays)})`),
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
      action: T(`أجّل غسيل الأملاح للحوض ${and(ids)} — المطر سيقوم به`, `Defer leaching in Basin ${and(ids)}: rain will do it`),
      reason: T(
        `ملوحة التربة فوق حد التحمّل (${list(basins.map((b) => `${b.id}: ${f(b.initial.ece)}`))} dS/m)، لكن يُتوقع أن يتسرب نحو ${f(flags.rainDrainage, 0)} مم من مياه أمطار اليوم ${and(rainDays)} تحت منطقة الجذور، وهي مياه عذبة تغسل الأملاح دون استهلاك مياه الخزان.`,
        `Soil salinity is above tolerance (${list(basins.map((b) => `${b.id}: ${f(b.initial.ece)}`))} dS/m), but about ${f(flags.rainDrainage, 0)} mm of rain on day ${and(rainDays)} is expected to drain below the root zone. Fresh rainwater leaches salts without using reservoir water.`,
      ),
      allocation: T("0 م³ من الخزان للغسيل", "0 m³ of reservoir water for leaching"),
      impact:
        T("ECe قبل المطر ← نهاية الفترة: ", "ECe before rain → end of period: ") +
        basins
          .map((b) => {
            const before = rainDays[0] > 1 ? b.days[rainDays[0] - 2].eceEnd : b.initial.ece;
            return `${b.id} ${f(before, 2)} ${arrow} ${f(b.days[b.days.length - 1].eceEnd, 2)}`;
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
      action: T(`لا يُوصى بغسيل الحوض ${and(withheld)} حالياً`, `Leaching not advised for Basin ${and(withheld)} now`),
      reason: flags.withheldBySupply
        ? T(
            `الملوحة فوق حد التحمّل، لكن المياه المتاحة خلال الفترة لا تكفي للري والغسيل معاً (LR = ${f(r.leachingRequirement * 100, 0)}%).`,
            `Salinity is above tolerance, but the period's water supply cannot cover both irrigation and leaching (LR = ${f(r.leachingRequirement * 100, 0)}%).`,
          )
        : T(
            `الملوحة فوق حد التحمّل، لكن مخزون الخزان في اليوم ${and(flags.leachingWithheldDays)} لا يتّسع للري والغسيل معاً`,
            `Salinity is above tolerance, but the reservoir stock on day ${and(flags.leachingWithheldDays)} cannot cover both irrigation and leaching`,
          ) +
          (rainExpected
            ? T("؛ والتربة أجفّ من أن تصرف مياه المطر المتوقعة تحت الجذور.", "; the soil is too dry for the forecast rain to drain below the roots.")
            : "."),
      allocation: T("تُوجَّه كل المياه لتلبية احتياج الري", "All water goes to meeting irrigation needs"),
      impact: `${T("ECe نهاية الفترة", "End-of-period ECe")}: ${pulse.basins
        .filter((b) => withheld.includes(b.id))
        .map((b) => `${b.id} ${f(b.initial.ece, 2)} ${arrow} ${f(b.days[b.days.length - 1].eceEnd, 2)}`)
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
      action: T(`عوّض تأخر المناوبة ${r.inputs.delayHours} ساعات`, `Compensate for the ${r.inputs.delayHours}-hour turn delay`),
      reason: T(
        `أثناء الانتظار تُستنزف حتى ${f(maxExtra)} مم إضافية؛ أُدرج هذا الاستنزاف في حساب الأولويات.`,
        `Up to ${f(maxExtra)} mm of extra depletion builds while waiting; it is included in the priority calculation.`,
      ),
      allocation: T(
        `${f(r.timeline[0].delivered)} م³ في اليوم 1 و${f(r.timeline[1]?.delivered ?? 0)} م³ في اليوم 2`,
        `${f(r.timeline[0].delivered)} m³ on day 1 and ${f(r.timeline[1]?.delivered ?? 0)} m³ on day 2`,
      ),
      impact: T("تُقدَّم الأحواض الأكثر جفافاً عند وصول المياه.", "The driest basins are served first when water arrives."),
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
      action: T("أدِر مخزون الخزان أثناء الانقطاع", "Manage reservoir stock through the outage"),
      reason: T(
        `يتوقف الإمداد من اليوم ${r.inputs.outageFromDay}؛ وصل ${f(r.totalDelivered)} م³ فقط من ${f(r.inputs.availableWater)} م³.`,
        `Supply stops from day ${r.inputs.outageFromDay}; only ${f(r.totalDelivered)} of ${f(r.inputs.availableWater)} m³ arrived.`,
      ),
      allocation: T(
        `مخزون محفوظ عند الانقطاع: ${f(Math.max(0, reserveAtOutage))} م³`,
        `Stock held when the outage begins: ${f(Math.max(0, reserveAtOutage))} m³`,
      ),
      impact: T(
        `أيام الإجهاد: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} تقليدياً.`,
        `Stress days: ${pulse.stressDays} with Pulse vs ${r.traditional.stressDays} traditionally.`,
      ),
    });
  }

  const saved = r.traditional.totalUsed - pulse.totalUsed;
  const pct = r.traditional.totalUsed > 0 ? (100 * saved) / r.traditional.totalUsed : 0;
  if (pct >= 1) {
    recs.push({
      id: "saving",
      kind: "saving",
      severity: "success",
      action: T(`وفّر ${f(saved)} م³ (${f(pct, 0)}%) مقارنة بالري التقليدي`, `Save ${f(saved)} m³ (${f(pct, 0)}%) vs traditional irrigation`),
      reason: T(
        `يمنع Pulse الري الزائد الذي يتسرب تحت منطقة الجذور (${f(totalDp(r.traditional) - totalDp(pulse), 0)} مم أقل من التسرب العميق).`,
        `Pulse avoids over-irrigation that drains below the root zone (${f(totalDp(r.traditional) - totalDp(pulse), 0)} mm less deep percolation).`,
      ),
      allocation: T(`${f(pulse.totalUsed)} م³ مقابل ${f(r.traditional.totalUsed)} م³`, `${f(pulse.totalUsed)} m³ vs ${f(r.traditional.totalUsed)} m³`),
      impact: T(`يبقى ${f(pulse.reservoirEnd)} م³ في الخزان للمناوبة التالية.`, `${f(pulse.reservoirEnd)} m³ stays in the reservoir for the next turn.`),
    });
  } else if (pulse.stressDays < r.traditional.stressDays) {
    recs.push({
      id: "stress",
      kind: "saving",
      severity: "success",
      action: T("وزّع المياه الشحيحة حسب الحاجة", "Distribute scarce water by need"),
      reason: T(
        "المياه المتاحة لا تسمح بتوفير كبير، لكن توجيهها للأحواض الأكثر حاجة يقلل الإجهاد.",
        "Available water leaves little to save, but directing it to the neediest basins reduces stress.",
      ),
      allocation: T(`${f(pulse.totalUsed)} م³ مستخدمة`, `${f(pulse.totalUsed)} m³ used`),
      impact: T(
        `أيام الإجهاد: ${pulse.stressDays} مع Pulse مقابل ${r.traditional.stressDays} تقليدياً.`,
        `Stress days: ${pulse.stressDays} with Pulse vs ${r.traditional.stressDays} traditionally.`,
      ),
    });
  }

  return recs;
}

function totalDp(s: SimulationResult["pulse"]): number {
  return s.basins.reduce((a, b) => a + b.totalDeepPercolation, 0);
}
