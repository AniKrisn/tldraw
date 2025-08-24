import { stopEventPropagation, T, TldrawUiSlider, useEditor } from 'tldraw'
import { MajorChordIcon } from '../../../components/icons/MajorChordIcon'
import { NODE_ROW_HEIGHT_PX } from '../../../constants'
import { NodeDefinition, NodeRow, outputPort, updateNode } from '../shared'

// B major scale intervals (all 7 notes)
const B_MAJOR_SCALE = [
	{ semitones: 0, name: 'B' }, // B (root)
	{ semitones: 2, name: 'C#' }, // C# (major 2nd)
	{ semitones: 4, name: 'D#' }, // D# (major 3rd)
	{ semitones: 5, name: 'E' }, // E (perfect 4th)
	{ semitones: 7, name: 'F#' }, // F# (perfect 5th)
	{ semitones: 9, name: 'G#' }, // G# (major 6th)
	{ semitones: 11, name: 'A#' }, // A# (major 7th)
] as const

// Base frequency for B4 (493.88 Hz)
const B4_FREQUENCY = 493.88

// Generate B major scale frequencies across multiple octaves
function generateBMajorScaleFrequencies(): { frequency: number; name: string }[] {
	const frequencies = []

	// Generate frequencies across 4 octaves (B2 to B6)
	for (let octave = -2; octave <= 2; octave++) {
		const octaveMultiplier = Math.pow(2, octave)
		for (const note of B_MAJOR_SCALE) {
			// Calculate frequency using equal temperament: f = base * 2^(semitones/12)
			const semitoneMultiplier = Math.pow(2, note.semitones / 12)
			const frequency = B4_FREQUENCY * octaveMultiplier * semitoneMultiplier

			// Only include frequencies within reasonable range
			if (frequency >= 55 && frequency <= 3520) {
				frequencies.push({
					frequency: Math.round(frequency * 100) / 100, // Round to 2 decimal places
					name: `${note.name}${4 + octave}`, // Standard note notation (e.g., B4, C#5)
				})
			}
		}
	}

	return frequencies.sort((a, b) => a.frequency - b.frequency)
}

const B_MAJOR_FREQUENCIES = generateBMajorScaleFrequencies()

// Find the closest B major scale frequency to a given value
function snapToBMajorScale(value: number): number {
	const closest = B_MAJOR_FREQUENCIES.reduce((prev, curr) =>
		Math.abs(curr.frequency - value) < Math.abs(prev.frequency - value) ? curr : prev
	)
	return closest.frequency
}

// Get the note name for a given frequency
function getNoteName(frequency: number): string {
	const match = B_MAJOR_FREQUENCIES.find((f) => Math.abs(f.frequency - frequency) < 0.01)
	return match ? match.name : '?'
}

/**
 * The slider node has a single output port and no inputs.
 */
export type MajorChordSliderNode = T.TypeOf<typeof MajorChordSliderNodeType>
export const MajorChordSliderNodeType = T.object({
	type: T.literal('majorChordSlider'),
	value: T.number.optional(), // Made optional for backwards compatibility
	stepIndex: T.number.optional(), // Legacy property for backwards compatibility
})

export const MajorChordSliderNode: NodeDefinition<MajorChordSliderNode> = {
	type: 'majorChordSlider',
	validator: MajorChordSliderNodeType,
	title: 'B Major Slider',
	icon: <MajorChordIcon />,
	getDefault: () => ({
		type: 'majorChordSlider',
		value: 493.88, // Start with B4
	}),
	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX,
	getPorts: () => ({
		output: outputPort,
	}),
	computeOutput: (node) => ({
		output: node.value ?? 440,
	}),
	Component: ({ shape, node }) => {
		const editor = useEditor()
		const currentValue = node.value ?? 493.88
		const noteName = getNoteName(currentValue)

		return (
			<>
				{/* Note name overlay in header area */}
				<div
					style={{
						position: 'absolute',
						top: '13px',
						right: '70px',
						fontSize: '12px',
						color: 'green',
						pointerEvents: 'none',
						zIndex: 1,
					}}
				>
					{noteName}
				</div>
				<NodeRow className="SliderNode" onPointerDown={stopEventPropagation}>
					<TldrawUiSlider
						steps={2000}
						value={currentValue}
						label="B Major"
						title="B Major Scale"
						onValueChange={(value) => {
							const snapped = snapToBMajorScale(value)
							editor.setSelectedShapes([shape.id])
							updateNode<MajorChordSliderNode>(editor, shape, (node) => ({
								...node,
								value: snapped,
							}))
						}}
						onHistoryMark={() => {}}
					/>
				</NodeRow>
			</>
		)
	},
}
