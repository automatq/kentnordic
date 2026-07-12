interface DayJumpNavProps {
  days: Array<{ day: number; title: string }>;
}

/**
 * Sticky pill strip jumping to each itinerary day. Plain same-page anchors:
 * the browser handles the scroll (scroll-margin on .day offsets the header),
 * and clicking also force-opens the target day's collapsed <details> so the
 * reader never lands on a closed card.
 */
export default function DayJumpNav({ days }: DayJumpNavProps) {
  return (
    <nav className="day-jump" aria-label="Jump to day">
      {days.map((d) => (
        <a
          key={d.day}
          href={`#day-${d.day}`}
          title={d.title}
          onClick={() => {
            document.getElementById(`day-${d.day}`)?.querySelector('details')?.setAttribute('open', '');
          }}
        >
          Day {d.day}
        </a>
      ))}
    </nav>
  );
}
