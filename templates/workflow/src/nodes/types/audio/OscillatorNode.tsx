import React from 'react'
import { T, useEditor, useValue } from 'tldraw'
import { OscillatorIcon } from '../../../components/icons/OscillatorIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX } from '../../../constants'
import { getNodeInputPortValues } from '../../nodePorts'
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

		// Get the current input values from connections (this updates automatically)
		const inputValues = useValue('input-values', () => getNodeInputPortValues(editor, shape), [
			editor,
			shape,
		])

		// Calculate the current effective frequency (from input or node property)
		const effectiveFrequency = inputValues.freqIn ?? node.frequency

		// Update oscillator when the effective frequency changes and it's playing
		React.useEffect(() => {
			if (node.isPlaying) {
				console.log('🎵 Effective frequency changed to:', effectiveFrequency)
				updateOscillatorParams(shape.id, { frequency: effectiveFrequency as number })
			}
		}, [effectiveFrequency, node.isPlaying, shape.id])

		console.log('🎵 OscillatorNode component rendering, node:', node)

		const handleFrequencyChange = (newFrequency: number) => {
			console.log('🎵 handleFrequencyChange called with:', newFrequency)

			const clampedFreq = Math.max(20, Math.min(20000, newFrequency))

			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				frequency: clampedFreq,
			}))
		}

		const handleWaveformChange = (waveform: OscillatorNodeType['waveform']) => {
			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				waveform,
			}))

			updateOscillatorParams(shape.id, { waveform })
		}

		const handlePlayToggle = async () => {
			console.log('🎵 Play button clicked, current playing state:', node.isPlaying)
			const newPlaying = !node.isPlaying

			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))

			console.log('🎵 Setting playing state to:', newPlaying)

			if (newPlaying) {
				console.log('🎵 Starting oscillator...')
				await startOscillator(shape.id, node)
			} else {
				console.log('🎵 Stopping oscillator...')
				stopOscillator(shape.id)
			}
		}

		console.log('🎵 About to render button, isPlaying:', node.isPlaying)

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
						onPointerDown={(e) => {
							console.log('🎵 onPointerDown fired!')
							e.stopPropagation()
							e.preventDefault()
						}}
						onMouseDown={(e) => {
							console.log('🎵 onMouseDown fired!')
							e.stopPropagation()
							e.preventDefault()
						}}
						style={{
							padding: '4px 8px',
							backgroundColor: node.isPlaying ? '#ff6b6b' : '#4caf50',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
							position: 'relative',
							zIndex: 1000,
							pointerEvents: 'auto', // Explicitly enable pointer events
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
	console.log('🎵 startOscillator called for node:', nodeId, 'with data:', nodeData)

	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	console.log('🎵 Audio context state:', context.state)

	// Stop any existing oscillator first
	stopOscillator(nodeId)

	// Create new oscillator
	const oscillator = context.createOscillator()
	console.log('🎵 Created oscillator:', oscillator)

	// Set initial values
	oscillator.frequency.setValueAtTime(nodeData.frequency, context.currentTime)
	oscillator.type = nodeData.waveform

	console.log(`🎵 Set frequency to ${nodeData.frequency}Hz, waveform to ${nodeData.waveform}`)

	// Connect and start
	oscillator.connect(context.destination)
	oscillator.start()

	console.log('🎵 Started oscillator')

	// Store references
	audioManager.registerNode(nodeId, oscillator)
	oscillators.set(nodeId, oscillator)

	console.log('🎵 Registered oscillator, total active oscillators:', oscillators.size)
}

function stopOscillator(nodeId: string) {
	const oscillator = oscillators.get(nodeId)
	if (oscillator) {
		try {
			oscillator.stop()
			console.log('🎵 Stopped oscillator for node:', nodeId)
		} catch (e) {
			console.log('🎵 Oscillator already stopped:', e)
		}
		oscillators.delete(nodeId)
	}

	AudioContextManager.getInstance().unregisterNode(nodeId)
}

async function updateOscillatorParams(
	nodeId: string,
	params: Partial<{ frequency: number; waveform: OscillatorNodeType['waveform'] }>
) {
	console.log('🎵 updateOscillatorParams called:', nodeId, params)

	const oscillator = oscillators.get(nodeId)
	if (!oscillator) {
		console.log('🎵 No oscillator found for node:', nodeId)
		return
	}

	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	// Update frequency in real-time
	if (params.frequency !== undefined) {
		console.log('🎵 Updating frequency from', oscillator.frequency.value, 'to:', params.frequency)
		try {
			oscillator.frequency.setValueAtTime(params.frequency, context.currentTime)
			console.log('🎵 Frequency updated successfully')
		} catch (error) {
			console.error('🎵 Error updating frequency:', error)
		}
	}

	// For waveform changes, we need to restart the oscillator
	if (params.waveform !== undefined) {
		console.log('🎵 Waveform change requires restart')
	}
}
