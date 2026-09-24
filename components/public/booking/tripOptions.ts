/** 08:00 to 18:00 in 30-minute steps — branch opening hours for handovers. */
export const HANDOVER_TIMES: string[] = Array.from({ length: 21 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
