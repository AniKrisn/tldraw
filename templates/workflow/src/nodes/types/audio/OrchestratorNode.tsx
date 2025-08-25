import { T, useEditor, useValue } from 'tldraw'
import { PlayIcon } from '../../../components/icons/PlayIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX } from '../../../constants'
import { Port } from '../../../ports/Port'
import { getNodePortConnections } from '../../nodePorts'
import { NodeShape } from '../../NodeShapeUtil'
import { NodeDefinition, updateNode } from '../shared'

/**
 * The orchestrator node can trigger playback on multiple connected oscillators.
 * It has multiple audio input ports and a single play button.
 */
export type OrchestratorNodeType = T.TypeOf<typeof OrchestratorNodeValidator>
export const OrchestratorNodeValidator = T.object({
	type: T.literal('orchestrator'),
	numInputs: T.number.optional(),
	isPlaying: T.boolean,
	// Legacy property for backward compatibility
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
		numInputs: 8, // Start with 8 input ports
		isPlaying: false,
	}),

	// Height includes space for input grid and play button
	getBodyHeightPx: (node) => {
		const numInputs = node.numInputs ?? 8
		const gridRows = Math.ceil(numInputs / 4) // 4 inputs per row
		return gridRows * 30 + NODE_ROW_HEIGHT_PX // 30px per grid row + play button row
	},

	getPorts: (node) => ({
		// Create input ports positioned in a 4x2 grid inside the shape
		...Object.fromEntries(
			Array.from({ length: node.numInputs ?? 8 }, (_, i) => {
				const col = i % 4 // 4 columns
				const row = Math.floor(i / 4) // 2 rows for 8 inputs
				return [
					`input_${i}`,
					{
						id: `input_${i}`,
						x: 20 + col * 45, // 20px margin, 45px spacing
						y: NODE_HEADER_HEIGHT_PX + 15 + row * 30, // 15px margin, 30px row spacing
						terminal: 'end',
					},
				]
			})
		),
	}),

	// The orchestrator doesn't produce numeric output, it triggers actions
	computeOutput: (_node, _inputs) => ({}),

	// No special port connect/disconnect handling needed

	Component: ({ shape, node }) => {
		const editor = useEditor()

		// Get all connected oscillator shapes - use useValue to react to connection changes
		const connectedOscillators = useValue(
			'connected-oscillators',
			() => {
				const connections = getNodePortConnections(editor, shape.id)
				console.log('🎭 DEBUG: Found connections:', connections.length)
				const oscillatorShapes: NodeShape[] = []

				for (const connection of connections) {
					console.log(
						'🎭 DEBUG: Connection:',
						connection.ownPortId,
						'->',
						connection.connectedShapeId
					)
					// Only process input ports (our connection points)
					if (connection.ownPortId.startsWith('input_')) {
						const connectedShape = editor.getShape(connection.connectedShapeId)
						if (connectedShape && editor.isShapeOfType<NodeShape>(connectedShape, 'node')) {
							console.log('🎭 DEBUG: Connected node type:', connectedShape.props.node.type)
							// Check if it's an oscillator node
							if (connectedShape.props.node.type === 'oscillator') {
								console.log('🎭 DEBUG: Adding oscillator:', connectedShape.id)
								oscillatorShapes.push(connectedShape)
							}
						}
					}
				}

				console.log('🎭 DEBUG: Total oscillators found:', oscillatorShapes.length)
				return oscillatorShapes
			},
			[editor, shape.id]
		)

		const handlePlayToggle = () => {
			const newPlaying = !node.isPlaying
			console.log(
				'🎭 DEBUG: Toggle to:',
				newPlaying,
				'with',
				connectedOscillators.length,
				'oscillators'
			)

			// Update this node's playing state
			updateNode<OrchestratorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))

			// Toggle all connected oscillators
			connectedOscillators.forEach((oscillatorShape, index) => {
				console.log(`🎭 DEBUG: Toggling oscillator ${index + 1}:`, oscillatorShape.id)
				// Get the fresh shape to ensure we have the latest state
				const freshShape = editor.getShape(oscillatorShape.id)
				if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
					console.log(`🎭 DEBUG: Current oscillator state:`, freshShape.props.node)
					updateNode<any>(editor, freshShape, (oscillatorNode: any) => {
						console.log(`🎭 DEBUG: Updating from:`, oscillatorNode, 'to playing:', newPlaying)
						return {
							...oscillatorNode,
							isPlaying: newPlaying,
						}
					})
				}
			})
		}

		return (
			<>
				{/* Input ports grid */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, 45px)',
						gap: '0px',
						padding: '15px 20px',
						justifyContent: 'start',
					}}
				>
					{Array.from({ length: node.numInputs ?? 8 }, (_, i) => (
						<div
							key={i}
							style={{
								position: 'relative',
								width: '45px',
								height: '30px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Port shapeId={shape.id} portId={`input_${i}`} />
							<span
								style={{
									fontSize: '10px',
									color: '#666',
									marginTop: '20px',
									position: 'absolute',
								}}
							>
								{i + 1}
							</span>
						</div>
					))}
				</div>

				{/* Play button */}
				<div className="NodeRow" style={{ marginTop: '10px' }}>
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
						{node.isPlaying ? '⏹' : '▶'}{' '}
						{connectedOscillators.length > 0 ? `(${connectedOscillators.length})` : ''}
					</button>
				</div>
			</>
		)
	},
}
