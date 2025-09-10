import { useRef } from 'react'
import { T, useEditor, useValue } from 'tldraw'
import { PlayIcon } from '../../../components/icons/PlayIcon'
import { NODE_HEADER_HEIGHT_PX } from '../../../constants'

import { Port } from '../../../ports/Port'
import { getNodePortConnections } from '../../nodePorts'
import { NodeShape } from '../../NodeShapeUtil'
import { NodeDefinition, updateNode } from '../shared'

const DEFAULT_ARP_SPEED = 250

export type OrchestratorNodeType = T.TypeOf<typeof OrchestratorNodeValidator>
export const OrchestratorNodeValidator = T.object({
	type: T.literal('orchestrator'),
	numInputs: T.number.optional(),
	isPlaying: T.boolean,
	mode: T.literalEnum('chord', 'arp', 'random').optional(),
	speed: T.number.optional(),
	inputs: T.any.optional(),
})

export const OrchestratorNode: NodeDefinition<OrchestratorNodeType> = {
	type: 'orchestrator',
	validator: OrchestratorNodeValidator,
	title: 'Orchestrator',
	heading: 'Orchestrator',
	icon: <PlayIcon />,
	getDefault: () => ({
		type: 'orchestrator',
		numInputs: 4,
		isPlaying: false,
		mode: 'chord' as const,
		speed: DEFAULT_ARP_SPEED,
	}),

	getBodyHeightPx: (node) => {
		const numInputs = node.numInputs ?? 4
		return numInputs * 20 + 0.5
	},

	getPorts: (node) => ({
		...Object.fromEntries(
			Array.from({ length: node.numInputs ?? 4 }, (_, i) => [
				`input_${i}`,
				{
					id: `input_${i}`,
					x: 0,
					y: NODE_HEADER_HEIGHT_PX + i * 20 + 14,
					terminal: 'end',
				},
			])
		),
	}),

	computeOutput: (_node, _inputs) => ({}),

	Component: ({ shape, node }) => {
		const editor = useEditor()
		const activeIntervalRef = useRef<NodeJS.Timeout | null>(null)

		const connectedOscillators = useValue(
			'connected-oscillators',
			() => {
				const connections = getNodePortConnections(editor, shape.id)
				const oscillatorShapes: { shape: NodeShape; inputIndex: number }[] = []

				for (const connection of connections) {
					if (connection.ownPortId.startsWith('input_')) {
						const connectedShape = editor.getShape(connection.connectedShapeId)
						if (connectedShape && editor.isShapeOfType<NodeShape>(connectedShape, 'node')) {
							if (connectedShape.props.node.type === 'oscillator') {
								const inputIndex = parseInt(connection.ownPortId.split('_')[1], 10)
								oscillatorShapes.push({ shape: connectedShape, inputIndex })
							}
						}
					}
				}

				// Sort by input index to ensure correct order (input_0, input_1, input_2, input_3)
				return oscillatorShapes
					.sort((a, b) => a.inputIndex - b.inputIndex)
					.map((item) => item.shape)
			},
			[editor, shape.id]
		)

		const clearActiveInterval = () => {
			if (activeIntervalRef.current) {
				clearInterval(activeIntervalRef.current)
				activeIntervalRef.current = null
			}
		}

		const startModePlayback = (mode: 'chord' | 'arp' | 'random') => {
			clearActiveInterval()

			if (mode === 'chord') {
				connectedOscillators.forEach((oscillatorShape) => {
					const freshShape = editor.getShape(oscillatorShape.id)
					if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
						updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
							...oscillatorNode,
							isPlaying: true,
						}))
					}
				})
			} else if (mode === 'arp') {
				let currentIndex = 0
				activeIntervalRef.current = setInterval(() => {
					connectedOscillators.forEach((oscillatorShape) => {
						const freshShape = editor.getShape(oscillatorShape.id)
						if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
							updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
								...oscillatorNode,
								isPlaying: false,
							}))
						}
					})

					if (connectedOscillators[currentIndex]) {
						const freshShape = editor.getShape(connectedOscillators[currentIndex].id)
						if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
							updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
								...oscillatorNode,
								isPlaying: true,
							}))
						}
					}

					currentIndex = (currentIndex + 1) % connectedOscillators.length

					const currentOrchestratorShape = editor.getShape(shape.id)
					if (
						!currentOrchestratorShape ||
						!editor.isShapeOfType<NodeShape>(currentOrchestratorShape, 'node') ||
						currentOrchestratorShape.props.node.type !== 'orchestrator' ||
						!(currentOrchestratorShape.props.node as OrchestratorNodeType).isPlaying
					) {
						clearActiveInterval()
					}
				}, node.speed ?? DEFAULT_ARP_SPEED)
			} else if (mode === 'random') {
				activeIntervalRef.current = setInterval(() => {
					connectedOscillators.forEach((oscillatorShape) => {
						const freshShape = editor.getShape(oscillatorShape.id)
						if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
							updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
								...oscillatorNode,
								isPlaying: false,
							}))
						}
					})

					if (connectedOscillators.length > 0) {
						const randomIndex = Math.floor(Math.random() * connectedOscillators.length)
						const freshShape = editor.getShape(connectedOscillators[randomIndex].id)
						if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
							updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
								...oscillatorNode,
								isPlaying: true,
							}))
						}
					}

					const currentOrchestratorShape = editor.getShape(shape.id)
					if (
						!currentOrchestratorShape ||
						!editor.isShapeOfType<NodeShape>(currentOrchestratorShape, 'node') ||
						currentOrchestratorShape.props.node.type !== 'orchestrator' ||
						!(currentOrchestratorShape.props.node as OrchestratorNodeType).isPlaying
					) {
						clearActiveInterval()
					}
				}, node.speed ?? DEFAULT_ARP_SPEED)
			}
		}

		const stopAllOscillators = () => {
			clearActiveInterval()
			connectedOscillators.forEach((oscillatorShape) => {
				const freshShape = editor.getShape(oscillatorShape.id)
				if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
					updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
						...oscillatorNode,
						isPlaying: false,
					}))
				}
			})
		}

		const handleModeChange = (newMode: 'chord' | 'arp' | 'random') => {
			const wasPlaying = node.isPlaying

			updateNode<OrchestratorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				mode: newMode,
			}))

			if (wasPlaying) {
				stopAllOscillators()
				startModePlayback(newMode)
			}
		}

		const handlePlayToggle = () => {
			const newPlaying = !node.isPlaying
			const currentMode = node.mode ?? 'chord'

			updateNode<OrchestratorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))

			if (newPlaying) {
				startModePlayback(currentMode)
			} else {
				stopAllOscillators()
			}
		}

		const numInputs = node.numInputs ?? 4

		return (
			<div
				style={{
					display: 'flex',
					height: '100%',
					width: '100%',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						width: '9px',
					}}
				>
					{Array.from({ length: numInputs }, (_, i) => (
						<div
							key={`input_${i}`}
							style={{
								height: '20px',
								padding: '2px',
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<Port shapeId={shape.id} portId={`input_${i}`} />
						</div>
					))}
				</div>

				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						margin: '4px',
						marginRight: '12px',
					}}
				>
					{/* Mode buttons */}
					<div
						style={{
							display: 'flex',
							gap: '2px',
							marginBottom: '4px',
						}}
					>
						{(['chord', 'arp', 'random'] as const).map((mode) => (
							<button
								key={mode}
								onClick={() => handleModeChange(mode)}
								onPointerDown={(e) => {
									e.stopPropagation()
									e.preventDefault()
								}}
								style={{
									flex: 1,
									padding: '6px 4px',
									backgroundColor: (node.mode ?? 'chord') === mode ? '#37353E' : '#D3DAD9',
									color: (node.mode ?? 'chord') === mode ? '#D3DAD9' : '#37353E',
									border:
										(node.mode ?? 'chord') === mode
											? '1px solid rgba(211, 218, 217, 0.3)'
											: '1px solid var(--tl-color-hint)',
									borderRadius: '4px',
									cursor: 'pointer',
									fontSize: '12px',
									fontFamily: '"Geist Mono", monospace',
									fontWeight: '500',
									position: 'relative',
									zIndex: 1000,
									pointerEvents: 'auto',
								}}
							>
								{mode.charAt(0).toUpperCase() + mode.slice(1)}
							</button>
						))}
					</div>

					{/* Play button */}
					<button
						onClick={handlePlayToggle}
						onPointerDown={(e) => {
							e.stopPropagation()
							e.preventDefault()
						}}
						style={{
							flex: 1,
							backgroundColor: node.isPlaying ? '#C06767' : '#67C090',
							color: 'white',
							border: node.isPlaying
								? '1px solid rgba(255, 255, 255, 0.2)'
								: '1px solid rgba(255, 255, 255, 0.2)',
							borderRadius: '8px',
							cursor: 'pointer',
							fontSize: node.isPlaying ? '18px' : '16px',
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
				</div>
			</div>
		)
	},
}
