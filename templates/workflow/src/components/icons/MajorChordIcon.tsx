export function MajorChordIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Staff lines */}
			<path d="M2 6H14" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
			<path d="M2 8H14" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
			<path d="M2 10H14" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />

			{/* Major chord notes - Root, 3rd, 5th stacked */}
			<circle cx="4" cy="10" r="1.2" fill="currentColor" />
			<circle cx="4" cy="8" r="1.2" fill="currentColor" />
			<circle cx="4" cy="6" r="1.2" fill="currentColor" />

			{/* Slider track */}
			<path d="M7 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

			{/* Slider handle */}
			<circle cx="10" cy="4" r="1.5" fill="currentColor" />

			{/* Musical note symbols for intervals */}
			<path d="M11.5 11.5V7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
			<circle cx="11.5" cy="11.5" r="0.8" fill="currentColor" />
		</svg>
	)
}
