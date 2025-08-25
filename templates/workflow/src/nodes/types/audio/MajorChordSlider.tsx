import React, { useCallback, useRef, useState } from 'react'
import { stopEventPropagation, T, TldrawUiSlider, useEditor, useUniqueSafeId } from 'tldraw'
import { CircleSliderIcon } from '../../../components/icons/CircleSliderIcon'
import { NODE_ROW_HEIGHT_PX } from '../../../constants'
import { NodeDefinition, NodeRow, outputPort, updateNode } from '../shared'

// Major scale intervals (all 7 notes)
const MAJOR_SCALE_INTERVALS = [
	{ semitones: 0, degree: 1 }, // Root
	{ semitones: 2, degree: 2 }, // Major 2nd
	{ semitones: 4, degree: 3 }, // Major 3rd
	{ semitones: 5, degree: 4 }, // Perfect 4th
	{ semitones: 7, degree: 5 }, // Perfect 5th
	{ semitones: 9, degree: 6 }, // Major 6th
	{ semitones: 11, degree: 7 }, // Major 7th
] as const

// All 12 keys with their root frequencies at octave 4
const KEY_DEFINITIONS = [
	{ key: 'C', rootFreq: 261.63, noteNames: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
	{ key: 'C#', rootFreq: 277.18, noteNames: ['C#', 'D#', 'F', 'F#', 'G#', 'A#', 'C'] },
	{ key: 'D', rootFreq: 293.66, noteNames: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
	{ key: 'D#', rootFreq: 311.13, noteNames: ['D#', 'F', 'G', 'G#', 'A#', 'C', 'D'] },
	{ key: 'E', rootFreq: 329.63, noteNames: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
	{ key: 'F', rootFreq: 349.23, noteNames: ['F', 'G', 'A', 'A#', 'C', 'D', 'E'] },
	{ key: 'F#', rootFreq: 369.99, noteNames: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F'] },
	{ key: 'G', rootFreq: 392.0, noteNames: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
	{ key: 'G#', rootFreq: 415.3, noteNames: ['G#', 'A#', 'C', 'C#', 'D#', 'F', 'G'] },
	{ key: 'A', rootFreq: 440.0, noteNames: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
	{ key: 'A#', rootFreq: 466.16, noteNames: ['A#', 'C', 'D', 'D#', 'F', 'G', 'A'] },
	{ key: 'B', rootFreq: 493.88, noteNames: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
] as const

// Generate major scale frequencies for a given key across multiple octaves
function generateMajorScaleFrequencies(keyIndex: number): { frequency: number; name: string }[] {
	const keyDef = KEY_DEFINITIONS[keyIndex]
	const frequencies = []

	// Generate frequencies across 4 octaves (octave 2 to 6)
	for (let octave = -2; octave <= 2; octave++) {
		const octaveMultiplier = Math.pow(2, octave)
		for (let i = 0; i < MAJOR_SCALE_INTERVALS.length; i++) {
			const interval = MAJOR_SCALE_INTERVALS[i]
			// Calculate frequency using equal temperament: f = base * 2^(semitones/12)
			const semitoneMultiplier = Math.pow(2, interval.semitones / 12)
			const frequency = keyDef.rootFreq * octaveMultiplier * semitoneMultiplier

			// Only include frequencies within reasonable range
			if (frequency >= 55 && frequency <= 3520) {
				frequencies.push({
					frequency: Math.round(frequency * 100) / 100, // Round to 2 decimal places
					name: `${keyDef.noteNames[i]}${4 + octave}`, // Standard note notation (e.g., B4, C#5)
				})
			}
		}
	}

	return frequencies.sort((a, b) => a.frequency - b.frequency)
}

// Cache for scale frequencies by key
const scaleFrequencyCache = new Map<number, { frequency: number; name: string }[]>()

// Get scale frequencies for a key (with caching)
function getScaleFrequencies(keyIndex: number): { frequency: number; name: string }[] {
	if (!scaleFrequencyCache.has(keyIndex)) {
		scaleFrequencyCache.set(keyIndex, generateMajorScaleFrequencies(keyIndex))
	}
	return scaleFrequencyCache.get(keyIndex)!
}

// Find the closest major scale frequency to a given value for a specific key
function snapToMajorScale(value: number, keyIndex: number): number {
	const frequencies = getScaleFrequencies(keyIndex)
	const closest = frequencies.reduce((prev, curr) =>
		Math.abs(curr.frequency - value) < Math.abs(prev.frequency - value) ? curr : prev
	)
	return closest.frequency
}

// Get the note name for a given frequency in a specific key
function getNoteName(frequency: number, keyIndex: number): string {
	const frequencies = getScaleFrequencies(keyIndex)
	const match = frequencies.find((f) => Math.abs(f.frequency - frequency) < 0.01)
	return match ? match.name : '?'
}

// Circular Slider Component for Key Selection
interface CircularSliderProps {
	value: number // 0-11 for the 12 keys
	onValueChange: (value: number) => void
	size?: number
}

const CircularSlider: React.FC<CircularSliderProps> = ({ value, onValueChange, size = 60 }) => {
	const [isDragging, setIsDragging] = useState(false)
	const sliderRef = useRef<SVGSVGElement>(null)
	const filterId = useUniqueSafeId()
	const clipPathId = useUniqueSafeId()
	const gradient1Id = useUniqueSafeId()
	const gradient2Id = useUniqueSafeId()

	const radius = (size - 20) / 2
	const centerX = size / 2
	const centerY = size / 2

	// Calculate angle from value (0-11 maps to 0-330 degrees, starting from top)
	const angleFromValue = (val: number) => val * 30 - 90 // -90 to start from top

	// Calculate value from angle
	const valueFromAngle = (angle: number) => {
		// Normalize angle to 0-360, starting from top
		let normalizedAngle = (angle + 90) % 360
		if (normalizedAngle < 0) normalizedAngle += 360
		return Math.round(normalizedAngle / 30) % 12
	}

	// Get angle from mouse position
	const getAngleFromEvent = useCallback((event: React.MouseEvent | MouseEvent) => {
		if (!sliderRef.current) return 0

		const rect = sliderRef.current.getBoundingClientRect()
		const centerX = rect.left + rect.width / 2
		const centerY = rect.top + rect.height / 2

		const deltaX = event.clientX - centerX
		const deltaY = event.clientY - centerY

		return Math.atan2(deltaY, deltaX) * (180 / Math.PI)
	}, [])

	const handleMouseDown = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault()
			event.stopPropagation()
			setIsDragging(true)

			const angle = getAngleFromEvent(event)
			const newValue = valueFromAngle(angle)
			onValueChange(newValue)
		},
		[getAngleFromEvent, onValueChange, value]
	)

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging) return

			const angle = getAngleFromEvent(event)
			const newValue = valueFromAngle(angle)
			onValueChange(newValue)
		},
		[isDragging, getAngleFromEvent, onValueChange]
	)

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
	}, [])

	// Add/remove global mouse listeners
	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
			}
		}
	}, [isDragging, handleMouseMove, handleMouseUp])

	// Calculate thumb position
	const angle = angleFromValue(value)
	const thumbX = centerX + radius * Math.cos((angle * Math.PI) / 180)
	const thumbY = centerY + radius * Math.sin((angle * Math.PI) / 180)

	// Create key labels around the circle
	const keyLabels = KEY_DEFINITIONS.map((keyDef, index) => {
		const labelAngle = angleFromValue(index)
		const labelRadius = radius + 15
		const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180)
		const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180)

		return (
			<text
				key={index}
				x={labelX}
				y={labelY}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize="11"
				fill={index === value ? '#37353E' : '#D3DAD9'}
				fontWeight={index === value ? '600' : '500'}
				fontFamily='"Geist Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
			>
				{keyDef.key}
			</text>
		)
	})

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: size + 30,
				position: 'relative',
				zIndex: 10,
				pointerEvents: 'all',
			}}
		>
			<svg
				ref={sliderRef}
				width={size + 30}
				height={size + 30}
				style={{
					zIndex: 10,
					position: 'relative',
					pointerEvents: 'none', // Disable events on the entire SVG
				}}
			>
				{/* Track circle - invisible larger hitbox */}
				<circle
					cx={centerX + 15}
					cy={centerY + 15}
					r={radius}
					fill="none"
					stroke="transparent"
					strokeWidth="100" // Large invisible hitbox
					style={{
						pointerEvents: 'all',
						cursor: isDragging ? 'grabbing' : 'grab',
					}}
					onMouseDown={handleMouseDown}
				/>

				{/* CircleSlider.svg in center - full complex version */}
				<g
					transform={`translate(${centerX + 15 - 38}, ${centerY + 15 - 32.5}) scale(1.3) rotate(${angleFromValue(value) + 90}, 29, 25)`}
					style={{ pointerEvents: 'none' }}
				>
					<defs>
						<filter
							id={filterId}
							x="0.25"
							y="-3.75"
							width="57.5"
							height="60.8"
							filterUnits="userSpaceOnUse"
							colorInterpolationFilters="sRGB"
						>
							<feFlood floodOpacity="0" result="BackgroundImageFix" />
							<feColorMatrix
								in="SourceAlpha"
								type="matrix"
								values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
								result="hardAlpha"
							/>
							<feOffset dy="4" />
							<feGaussianBlur stdDeviation="2.65" />
							<feComposite in2="hardAlpha" operator="out" />
							<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
							<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_29_75" />
							<feBlend
								mode="normal"
								in="SourceGraphic"
								in2="effect1_dropShadow_29_75"
								result="shape"
							/>
						</filter>
						<clipPath id={clipPathId}>
							<circle cx="29" cy="25" r="20" transform="translate(-0.25 3.75)" />
						</clipPath>
						<linearGradient
							id={gradient1Id}
							x1="29"
							y1="5"
							x2="29"
							y2="45"
							gradientUnits="userSpaceOnUse"
						>
							<stop stopColor="#3C444F" />
							<stop offset="1" stopColor="#1B1F25" />
						</linearGradient>
						<linearGradient
							id={gradient2Id}
							x1="29"
							y1="5"
							x2="29"
							y2="23.7826"
							gradientUnits="userSpaceOnUse"
						>
							<stop stopColor="#1F2937" />
							<stop offset="0.278846" stopColor="#6C6B6B" />
							<stop offset="1" stopColor="#151515" />
						</linearGradient>
					</defs>

					{/* Backdrop blur effect */}
					<foreignObject x="0.25" y="-3.75" width="57.5" height="60.8">
						<div
							style={{
								backdropFilter: 'blur(1px)',
								clipPath: `url(#${clipPathId})`,
								height: '1%',
								width: '1%',
							}}
						/>
					</foreignObject>

					{/* Main circle with drop shadow */}
					<g filter={`url(#${filterId})`}>
						<circle cx="29" cy="25" r="20" fill="#171717" />
						<circle cx="29" cy="25" r="21.375" stroke={`url(#${gradient1Id})`} strokeWidth="2.75" />
					</g>

					{/* Inner circle */}
					<circle cx="29" cy="25" r="20.75" fill="#171717" stroke="#1F2937" strokeWidth="1.5" />

					{/* Indicator/needle */}
					<path
						d="M30.0137 23C30.2844 23 30.506 22.7845 30.5135 22.5139L30.9857 5.51388C30.9935 5.23241 30.7675 5 30.4859 5H27.5141C27.2325 5 27.0065 5.23241 27.0143 5.51388L27.4865 22.5139C27.494 22.7845 27.7156 23 27.9863 23H30.0137Z"
						fill={`url(#${gradient2Id})`}
					/>
				</g>

				{/* Key labels - non-interactive */}
				{keyLabels.map((label, index) =>
					React.cloneElement(label, {
						key: index,
						x: label.props.x + 15,
						y: label.props.y + 15,
						style: { pointerEvents: 'none' },
					})
				)}

				{/* Thumb - invisible larger hitbox */}
				<circle
					cx={thumbX + 15}
					cy={thumbY + 15}
					r="15" // Large invisible hitbox around thumb
					fill="transparent"
					style={{
						pointerEvents: 'all',
						cursor: isDragging ? 'grabbing' : 'grab',
					}}
					onMouseDown={handleMouseDown}
				/>

				{/* Thumb - visible
				<circle
					cx={thumbX + 15}
					cy={thumbY + 15}
					r="6"
					fill="#0066ff"
					stroke="white"
					strokeWidth="2"
					style={{
						pointerEvents: 'none', // Let the invisible hitbox handle events
					}}
				/> */}
			</svg>
		</div>
	)
}

/**
 * The slider node has a single output port and no inputs.
 */
export type MajorChordSliderNode = T.TypeOf<typeof MajorChordSliderNodeType>
export const MajorChordSliderNodeType = T.object({
	type: T.literal('majorChordSlider'),
	value: T.number.optional(), // Made optional for backwards compatibility
	stepIndex: T.number.optional(), // Legacy property for backwards compatibility
	keyIndex: T.number.optional(), // Index into KEY_DEFINITIONS array
})

export const MajorChordSliderNode: NodeDefinition<MajorChordSliderNode> = {
	type: 'majorChordSlider',
	validator: MajorChordSliderNodeType,
	title: 'Major Scale',
	icon: <CircleSliderIcon />,
	getDefault: () => ({
		type: 'majorChordSlider',
		value: 261.63, // Start with C4
		keyIndex: 0, // Start with C major
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX + 130, // Circular slider + styled note slider
	getPorts: () => ({
		output: outputPort,
	}),
	computeOutput: (node) => ({
		output: node.value ?? 440,
	}),
	Component: ({ shape, node }) => {
		const editor = useEditor()
		const currentKeyIndex = node.keyIndex ?? 0
		const currentValue = node.value ?? KEY_DEFINITIONS[currentKeyIndex].rootFreq
		const currentKey = KEY_DEFINITIONS[currentKeyIndex]
		const noteName = getNoteName(currentValue, currentKeyIndex)

		return (
			<>
				<style>
					{`
						.NodeShape-output {
							font-family: "Geist Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace !important;
						}
					`}
				</style>
				{/* Note name overlay in header area */}
				<div
					style={{
						position: 'absolute',
						top: '27px',
						right: '9px',
						fontSize: '14px',
						fontFamily:
							'"Geist Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
						fontWeight: '500',
						color: '#67C090',
						pointerEvents: 'none',
						zIndex: 1,
						padding: '1px 4px',
						borderRadius: '3px',
					}}
				>
					{noteName}
				</div>

				{/* Circular key selector */}
				<div
					style={{
						padding: '5px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						width: '100%',
						position: 'relative',
						zIndex: 5,
						pointerEvents: 'none',
					}}
				>
					<CircularSlider
						value={currentKeyIndex}
						onValueChange={(keyIndex) => {
							// When changing key, snap current value to the new key's scale
							const snappedValue = snapToMajorScale(currentValue, keyIndex)

							editor.setSelectedShapes([shape.id])
							updateNode<MajorChordSliderNode>(editor, shape, (node) => ({
								...node,
								keyIndex: keyIndex,
								value: snappedValue,
							}))
						}}
						size={90}
					/>
				</div>

				{/* Note selector slider */}
				<NodeRow className="SliderNode" onPointerDown={stopEventPropagation}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '2px',
							width: '100%',
						}}
					>
						{/* Custom styled slider */}
						<div
							style={{
								position: 'relative',
								width: '100%',
								height: '40px',
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<style>
								{`
									.SliderNode .tlui-slider__track {
										background-color: #D3DAD9 !important;
										height: 4px !important;
									}
									.SliderNode .tlui-slider__range {
										background-color: #37353E !important;
									}
									.SliderNode .tlui-slider__thumb {
										background: #171717 !important;
										border: 2px solid #37353E !important;
										width: 16px !important;
										height: 16px !important;
										box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
									}
									.SliderNode .tlui-slider__thumb:hover {
										transform: scale(1.1) !important;
									}
								`}
							</style>
							<TldrawUiSlider
								steps={2000}
								value={currentValue}
								label=""
								title={`${currentKey.key} Major Scale`}
								onValueChange={(value) => {
									const snapped = snapToMajorScale(value, currentKeyIndex)
									editor.setSelectedShapes([shape.id])
									updateNode<MajorChordSliderNode>(editor, shape, (node) => ({
										...node,
										value: snapped,
									}))
								}}
								onHistoryMark={() => {}}
							/>
						</div>
					</div>
				</NodeRow>
			</>
		)
	},
}
