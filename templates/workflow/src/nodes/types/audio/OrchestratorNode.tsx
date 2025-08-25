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
	}),

	getBodyHeightPx: (node) => {
		const numInputs = node.numInputs ?? 4
		return numInputs * 20
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

		const handlePlayToggle = () => {
			const newPlaying = !node.isPlaying

			updateNode<OrchestratorNodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				isPlaying: newPlaying,
			}))

			connectedOscillators.forEach((oscillatorShape) => {
				const freshShape = editor.getShape(oscillatorShape.id)
				if (freshShape && editor.isShapeOfType<NodeShape>(freshShape, 'node')) {
					updateNode<any>(editor, freshShape, (oscillatorNode: any) => ({
						...oscillatorNode,
						isPlaying: newPlaying,
					}))
				}
			})
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

				<button
					onClick={handlePlayToggle}
					onPointerDown={(e) => {
						e.stopPropagation()
						e.preventDefault()
					}}
					style={{
						flex: 1,
						margin: '4px',
						marginRight: '12px',
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
		)
	},
}
