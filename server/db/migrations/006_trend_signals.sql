-- Trend signals from Pinterest Trends (or any other source).
-- growth:       the headline figure as shown at the source, e.g. '↑243%'
-- growth_note:  what the figure measures, e.g. 'month over month'
-- measured_at:  when the figure was read, so pages can show "· Oct 2026"
-- edit:         editorial grouping on /trending, e.g. 'The Beauty Shelf'
alter table trends add column if not exists growth text;
alter table trends add column if not exists growth_note text;
alter table trends add column if not exists measured_at date;
alter table trends add column if not exists edit text;
