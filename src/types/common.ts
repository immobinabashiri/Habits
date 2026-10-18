// A calendar day in the USER's own time zone, formatted "YYYY-MM-DD".
// Stored as a plain string on purpose: it must never be shifted by UTC conversion.
export type DateKey = string;

// 0 = Sunday ... 6 = Saturday (same as the HTML app).
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;