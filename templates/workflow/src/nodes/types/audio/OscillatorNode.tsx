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
	heading: 'Oscillator',
	icon: <OscillatorIcon />,
	getDefault: () => ({
		type: 'oscillator',
		frequency: 440,
		waveform: 'sine' as const,
		isPlaying: false,
	}),

	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 3,

	getPorts: () => ({
		output: {
			id: 'output',
			x: 235,
			y: NODE_HEADER_HEIGHT_PX / 2,
			terminal: 'start',
		},
		freqIn: {
			id: 'freqIn',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEIGHT_PX / 2 + 4,
			terminal: 'end',
		},
	}),

	computeOutput: (node, inputs) => ({
		output: node.isPlaying ? 1 : 0,
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
				updateOscillatorParams(shape.id, { frequency: effectiveFrequency as number })
			}
		}, [effectiveFrequency, node.isPlaying, shape.id])

		// Update oscillator when waveform changes and it's playing
		React.useEffect(() => {
			if (node.isPlaying) {
				updateOscillatorParams(shape.id, { waveform: node.waveform })
			}
		}, [node.waveform, node.isPlaying, shape.id])

		// React to changes in isPlaying state (including external changes from orchestrator)
		React.useEffect(() => {
			if (node.isPlaying) {
				const nodeDataWithEffectiveFreq = {
					...node,
					frequency: effectiveFrequency as number,
				}
				startOscillator(shape.id, nodeDataWithEffectiveFreq)
			} else {
				stopOscillator(shape.id)
			}
		}, [node.isPlaying, shape.id, effectiveFrequency, node.waveform])

		const handleFrequencyChange = (newFrequency: number) => {
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

			// Update immediately if playing
			if (node.isPlaying) {
				updateOscillatorParams(shape.id, { waveform })
			}
		}

		const handlePlayToggle = () => {
			const newPlaying = !node.isPlaying

			// Just update the state - the useEffect will handle starting/stopping audio
			updateNode<OscillatorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))
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
							e.stopPropagation()
							e.preventDefault()
						}}
						style={{
							width: '100%',
							padding: '8px',
							backgroundColor: node.isPlaying ? '#ff6b6b' : '#4caf50',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
							position: 'relative',
							zIndex: 1000,
							pointerEvents: 'auto',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '16px',
						}}
					>
						{node.isPlaying ? '⏹' : '▶'}
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

	// Stop any existing oscillator first
	stopOscillator(nodeId)

	// Create new oscillator
	const oscillator = context.createOscillator()

	// Set initial values
	oscillator.frequency.setValueAtTime(nodeData.frequency, context.currentTime)
	oscillator.type = nodeData.waveform

	// Connect and start
	oscillator.connect(context.destination)
	oscillator.start()

	// Store references
	audioManager.registerNode(nodeId, oscillator)
	oscillators.set(nodeId, oscillator)
}

function stopOscillator(nodeId: string) {
	const oscillator = oscillators.get(nodeId)
	if (oscillator) {
		try {
			oscillator.stop()
		} catch (e) {
			// Oscillator already stopped
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
	if (!oscillator) {
		return
	}

	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	// Update frequency in real-time
	if (params.frequency !== undefined) {
		try {
			oscillator.frequency.setValueAtTime(params.frequency, context.currentTime)
		} catch (error) {
			// Error updating frequency
		}
	}

	// For waveform changes, we need to restart the oscillator
	if (params.waveform !== undefined) {
		try {
			oscillator.type = params.waveform
		} catch (error) {
			// Error updating waveform
		}
	}
}
