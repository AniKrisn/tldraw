import { useRef } from 'react'
import { T, useEditor, useValue } from 'tldraw'
import { PlayIcon } from '../../../components/icons/PlayIcon'
import { NODE_HEADER_HEIGHT_PX } from '../../../constants'

import { Port } from '../../../ports/Port'
import { getNodePortConnections } from '../../nodePorts'
import { NodeShape } from '../../NodeShapeUtil'
import { NodeDefinition, updateNode } from '../shared'

export type OrchestratorNodeType = T.TypeOf<typeof OrchestratorNodeValidator>
export const OrchestratorNodeValidator = T.object({
	type: T.literal('orchestrator'),
	numInputs: T.number.optional(),
	isPlaying: T.boolean,
	mode: T.literalEnum('chord', 'arp', 'random').optional(),
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
	}),

	getBodyHeightPx: (node) => {
		const numInputs = node.numInputs ?? 4
		return numInputs * 20 + 30
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
				const oscillatorShapes: NodeShape[] = []

				for (const connection of connections) {
					if (connection.ownPortId.startsWith('input_')) {
						const connectedShape = editor.getShape(connection.connectedShapeId)
						if (connectedShape && editor.isShapeOfType<NodeShape>(connectedShape, 'node')) {
							if (connectedShape.props.node.type === 'oscillator') {
								oscillatorShapes.push(connectedShape)
							}
						}
					}
				}

				return oscillatorShapes
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
			// Always clear any existing interval first
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
				}, 500)
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
				}, 300)
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
									padding: '2px 4px',
									backgroundColor: (node.mode ?? 'chord') === mode ? '#333' : '#666',
									color: 'white',
									border: 'none',
									borderRadius: '2px',
									cursor: 'pointer',
									fontSize: '10px',
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
							backgroundColor: node.isPlaying ? '#ff6b6b' : '#4caf50',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
							fontSize: '14px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							position: 'relative',
							zIndex: 1000,
							pointerEvents: 'auto',
						}}
					>
						{node.isPlaying ? '⏹' : '▶'}
					</button>
				</div>
			</div>
		)
	},
}
