import { T, useEditor } from 'tldraw'
import { OscillatorIcon } from '../../../components/icons/OscillatorIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX } from '../../../constants'
import { NodeDefinition, NodeInputRow, NodeRow, updateNode } from '../shared'
import { AudioContextManager } from './AudioContext'

export type OscillatorNodeType = T.TypeOf<typeof OscillatorNodeValidator>
export const OscillatorNodeValidator = T.object({
	type: T.literal('oscillator'),
	frequency: T.number,
	waveform: T.literalEnum('sine', 'square', 'sawtooth', 'triangle'),
	isPlaying: T.boolean,
})

export const OscillatorNode: NodeDefinition<OscillatorNodeType> = {
	type: 'oscillator',
	validator: OscillatorNodeValidator,
	title: 'Oscillator',
	heading: '🎵 OSC',
	icon: <OscillatorIcon />,
	getDefault: () => ({
		type: 'oscillator',
		frequency: 440,
		waveform: 'sine' as const,
		isPlaying: false,
	}),

	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 3,

	getPorts: () => ({
		audioOut: {
			id: 'audioOut',
			x: 200,
			y: NODE_HEADER_HEIGHT_PX / 2,
			terminal: 'start',
		},
		freqIn: {
			id: 'freqIn',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEIGHT_PX / 2,
			terminal: 'end',
		},
	}),

	computeOutput: (node, inputs) => ({
		audioOut: node.isPlaying ? 1 : 0,
		frequency: inputs.freqIn ?? node.frequency,
	}),

	Component: ({ shape, node }) => {
		const editor = useEditor()

		const handleFrequencyChange = async (newFrequency: number) => {
			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				frequency: Math.max(20, Math.min(20000, newFrequency)),
			}))

			await updateOscillatorParams(shape.id, { frequency: newFrequency })
		}

		const handleWaveformChange = (waveform: OscillatorNodeType['waveform']) => {
			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				waveform,
			}))

			updateOscillatorParams(shape.id, { waveform })
		}

		const handlePlayToggle = async () => {
			const newPlaying = !node.isPlaying

			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))

			if (newPlaying) {
				await startOscillator(shape.id, node)
			} else {
				stopOscillator(shape.id)
			}
		}

		return (
			<>
				<NodeInputRow
					shapeId={shape.id}
					portId="freqIn"
					value={node.frequency}
					onChange={handleFrequencyChange}
				/>

				<NodeRow className="NodeRow">
					<span>Wave:</span>
					<select
						value={node.waveform}
						onChange={(e) => handleWaveformChange(e.target.value as OscillatorNodeType['waveform'])}
						onPointerDown={(e) => e.stopPropagation()}
					>
						<option value="sine">Sine</option>
						<option value="square">Square</option>
						<option value="sawtooth">Saw</option>
						<option value="triangle">Triangle</option>
					</select>
				</NodeRow>

				<NodeRow className="NodeRow">
					<button
						onClick={handlePlayToggle}
						onPointerDown={(e) => e.stopPropagation()}
						style={{
							padding: '4px 8px',
							backgroundColor: node.isPlaying ? '#ff6b6b' : '#4caf50',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
						}}
					>
						{node.isPlaying ? '⏹ Stop' : '▶ Play'}
					</button>
				</NodeRow>
			</>
		)
	},
}

// Audio management functions
const oscillators: Map<string, OscillatorNode> = new Map()

async function startOscillator(nodeId: string, nodeData: OscillatorNodeType) {
	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	stopOscillator(nodeId)

	const oscillator = context.createOscillator()
	oscillator.frequency.setValueAtTime(nodeData.frequency, context.currentTime)
	oscillator.type = nodeData.waveform

	oscillator.connect(context.destination)
	oscillator.start()

	audioManager.registerNode(nodeId, oscillator)
	oscillators.set(nodeId, oscillator)
}

function stopOscillator(nodeId: string) {
	const oscillator = oscillators.get(nodeId)
	if (oscillator) {
		try {
			oscillator.stop()
		} catch (e) {
			// Already stopped
		}
		oscillators.delete(nodeId)
	}

	AudioContextManager.getInstance().unregisterNode(nodeId)
}

async function updateOscillatorParams(
	nodeId: string,
	params: Partial<{ frequency: number; waveform: OscillatorNodeType['waveform'] }>
) {
	const oscillator = oscillators.get(nodeId)
	if (oscillator) {
		if (params.frequency !== undefined) {
			const audioManager = AudioContextManager.getInstance()
			const context = await audioManager.getContext()
			oscillator.frequency.setValueAtTime(params.frequency, context.currentTime)
		}

		if (params.waveform !== undefined) {
			oscillator.type = params.waveform
		}
	}
}
