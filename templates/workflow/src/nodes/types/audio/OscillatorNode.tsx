import React from 'react'
import { T, useEditor, useValue } from 'tldraw'
import { OscillatorIcon } from '../../../components/icons/OscillatorIcon'
import { SawtoothWaveIcon } from '../../../components/icons/SawtoothWaveIcon'
import { SineWaveIcon } from '../../../components/icons/SineWaveIcon'
import { SquareWaveIcon } from '../../../components/icons/SquareWaveIcon'
import { TriangleWaveIcon } from '../../../components/icons/TriangleWaveIcon'
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

		const getWaveformIcon = (waveform: OscillatorNodeType['waveform']) => {
			switch (waveform) {
				case 'sine':
					return <SineWaveIcon />
				case 'square':
					return <SquareWaveIcon />
				case 'sawtooth':
					return <SawtoothWaveIcon />
				case 'triangle':
					return <TriangleWaveIcon />
				default:
					return <SineWaveIcon />
			}
		}

		return (
			<>
				<style>
					{`
						.NodeInputRow input {
							font-family: "Geist Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace !important;
						}
					`}
				</style>
				<NodeInputRow
					shapeId={shape.id}
					portId="freqIn"
					value={node.frequency}
					onChange={handleFrequencyChange}
				/>

				<NodeRow className="NodeRow">
					<div
						style={{
							display: 'flex',
							gap: '2px',
							width: '100%',
						}}
					>
						{(['sine', 'square', 'sawtooth', 'triangle'] as const).map((waveform) => (
							<button
								key={waveform}
								onClick={() => handleWaveformChange(waveform)}
								onPointerDown={(e) => {
									e.stopPropagation()
									e.preventDefault()
								}}
								style={{
									flex: 1,
									padding: '8px 4px',
									backgroundColor: node.waveform === waveform ? '#37353E' : '#D3DAD9',
									color: node.waveform === waveform ? '#D3DAD9' : '#37353E',
									border:
										node.waveform === waveform
											? '1px solid rgba(211, 218, 217, 0.3)'
											: '1px solid var(--tl-color-hint)',
									borderRadius: '4px',
									cursor: 'pointer',
									position: 'relative',
									zIndex: 1000,
									pointerEvents: 'auto',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								{getWaveformIcon(waveform)}
							</button>
						))}
					</div>
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
							backgroundColor: node.isPlaying ? '#C06767' : '#67C090',
							color: 'white',
							border: node.isPlaying
								? '1px solid rgba(255, 255, 255, 0.2)'
								: '1px solid rgba(255, 255, 255, 0.2)',
							borderRadius: '8px',
							cursor: 'pointer',
							fontSize: '16px',
							fontWeight: '500',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							position: 'relative',
							zIndex: 1000,
							pointerEvents: 'auto',
							boxShadow: node.isPlaying
								? '0 2px 8px rgba(192, 103, 103, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
								: '0 2px 8px rgba(103, 192, 144, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
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

const oscillators: Map<
	string,
	{
		oscillators: OscillatorNode[]
		gains: GainNode[]
		mixerGain: GainNode
	}
> = new Map()

async function startOscillator(nodeId: string, nodeData: OscillatorNodeType) {
	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	// Stop any existing oscillator first
	stopOscillator(nodeId)

	// Create three oscillators (like Moog Model 4)
	const osc1 = context.createOscillator()
	const osc2 = context.createOscillator()
	const osc3 = context.createOscillator()

	// Set initial values
	osc1.frequency.setValueAtTime(nodeData.frequency, context.currentTime) // Root
	osc2.frequency.setValueAtTime(nodeData.frequency * 1.0115, context.currentTime) // Slightly detuned
	osc3.frequency.setValueAtTime(nodeData.frequency * 0.501, context.currentTime + 0.01) // Sub-oscillator

	// Set waveforms for all oscillators
	osc1.type = nodeData.waveform
	osc2.type = nodeData.waveform
	osc3.type = nodeData.waveform

	const osc1Gain = context.createGain()
	const osc2Gain = context.createGain()
	const osc3Gain = context.createGain()

	osc1Gain.gain.value = 0.25
	osc2Gain.gain.value = 0.3
	osc3Gain.gain.value = 0.1

	// mixer to combine oscillators
	const mixerGain = context.createGain()

	osc1.connect(osc1Gain).connect(mixerGain)
	osc2.connect(osc2Gain).connect(mixerGain)
	osc3.connect(osc3Gain).connect(mixerGain)
	mixerGain.connect(context.destination)

	osc1.start()
	osc2.start()
	osc3.start()

	const nodes = {
		oscillators: [osc1, osc2, osc3],
		gains: [osc1Gain, osc2Gain, osc3Gain],
		mixerGain,
	}

	// Store references
	audioManager.registerNode(nodeId, mixerGain)
	oscillators.set(nodeId, nodes)
}

function stopOscillator(nodeId: string) {
	const nodes = oscillators.get(nodeId)
	if (nodes) {
		try {
			nodes.oscillators.forEach((osc) => osc.stop())
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
	const nodes = oscillators.get(nodeId)
	if (!nodes) {
		return
	}

	const audioManager = AudioContextManager.getInstance()
	const context = await audioManager.getContext()

	// Update frequency in real-time
	if (params.frequency !== undefined) {
		try {
			nodes.oscillators[0].frequency.setValueAtTime(params.frequency, context.currentTime)
			nodes.oscillators[1].frequency.setValueAtTime(params.frequency, context.currentTime)
			nodes.oscillators[2].frequency.setValueAtTime(params.frequency, context.currentTime)
		} catch (error) {
			// Error updating frequency
		}
	}

	// For waveform changes, we need to restart the oscillator
	if (params.waveform !== undefined) {
		const waveform = params.waveform // we do this so that typescript knows this isn't undefined
		try {
			nodes.oscillators.forEach((osc) => (osc.type = waveform))
		} catch (error) {
			// Error updating waveform
		}
	}
}
