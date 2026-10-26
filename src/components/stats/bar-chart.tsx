// A small accessible bar chart made of plain HTML (no chart library, no client JS).
// Every chart has a text summary for screen readers and a "show as table" fallback,
// so nothing depends on seeing the bars or telling colours apart.

export interface ChartBar {
  label: string; // short text under the bar ("26" or "Oct 5")
  caption: string; // full description: tooltip and table row header
  values: number[]; // one number per series
}

export interface ChartSeries {
  name: string;
  barClass: string; // Tailwind classes that colour the bar and its legend swatch
}

interface BarChartProps {
  title: string;
  summary: string; // read by screen readers instead of the bars
  bars: ChartBar[];
  series: ChartSeries[];
  // overlay: the second series is drawn inside the first ("done" inside "scheduled")
  // grouped: the series stand side by side
  mode: "overlay" | "grouped";
}

const heightOf = (value: number, max: number) =>
  value <= 0 ? "0%" : `${Math.max(3, Math.round((value / max) * 100))}%`;

export function BarChart({ title, summary, bars, series, mode }: BarChartProps) {
  const max = Math.max(1, ...bars.flatMap((bar) => bar.values));
  const labelEvery = Math.ceil(bars.length / 7); // never more than about 7 labels

  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-bold tracking-tight">{title}</span>
        <ul className="flex flex-wrap gap-x-4 text-xs text-muted-foreground" aria-label="Legend">
          {series.map((item) => (
            <li key={item.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2.5 rounded-sm ${item.barClass}`} />
              {item.name}
            </li>
          ))}
        </ul>
      </figcaption>

      <div role="img" aria-label={summary} className="mt-4">
        <p aria-hidden="true" className="mb-1 text-[11px] text-muted-foreground">
          Highest bar: {max}
        </p>
        <div aria-hidden="true" className="flex h-36 items-end gap-px border-b border-border sm:gap-0.5">
          {bars.map((bar) => (
            <div key={bar.caption} title={bar.caption} className="flex h-full min-w-0 flex-1 items-end justify-center">
              {mode === "overlay" ? (
                <div className="relative h-full w-full">
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-sm ${series[0].barClass}`}
                    style={{ height: heightOf(bar.values[0], max) }}
                  />
                  <div
                    className={`absolute inset-x-[15%] bottom-0 rounded-t-sm ${series[1].barClass}`}
                    style={{ height: heightOf(bar.values[1], max) }}
                  />
                </div>
              ) : (
                <div className="flex h-full w-full items-end gap-px">
                  {series.map((item, index) => (
                    <div
                      key={item.name}
                      className={`flex-1 rounded-t-sm ${item.barClass}`}
                      style={{ height: heightOf(bar.values[index], max) }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1 flex gap-px sm:gap-0.5">
          {bars.map((bar, index) => (
            <span key={bar.caption} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">
              {index % labelEvery === 0 ? bar.label : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">
          Show as a table
        </summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Period
                </th>
                {series.map((item) => (
                  <th key={item.name} scope="col" className="py-1.5 pr-3 text-right font-medium">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.caption} className="border-b border-border/60">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    {bar.caption}
                  </th>
                  {bar.values.map((value, index) => (
                    <td key={series[index].name} className="py-1.5 pr-3 text-right tabular-nums">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
