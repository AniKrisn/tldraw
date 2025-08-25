import React from 'react'

export const CircleSliderIcon: React.FC = () => {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Outer circle */}
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />

			{/* Inner thumb/indicator */}
			<circle cx="12" cy="5" r="2" fill="currentColor" />

			{/* "M" for Major */}
			<text
				x="12"
				y="12"
				textAnchor="middle"
				dominantBaseline="central"
				fontSize="8"
				fontWeight="bold"
				fill="currentColor"
			>
				M
			</text>
		</svg>
	)
}
