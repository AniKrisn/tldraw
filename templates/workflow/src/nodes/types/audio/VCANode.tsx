import { T, useEditor } from 'tldraw'
import { AudioIcon } from '../../../components/icons/AudioIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEIGHT_PX } from '../../../constants'
import { NodeDefinition, NodeInputRow, updateNode } from '../shared'

export type VCANodeType = T.TypeOf<typeof VCANodeValidator>
export const VCANodeValidator = T.object({
	type: T.literal('vca'),
	gain: T.number,
})

export const VCANode: NodeDefinition<VCANodeType> = {
	type: 'vca',
	validator: VCANodeValidator,
	title: 'VCA',
	heading: 'VCA',
	icon: <AudioIcon />,
	getDefault: (): VCANodeType => ({
		type: 'vca',
		gain: 0.8,
	}),

	getBodyHeightPx: () => NODE_ROW_HEIGHT_PX * 1,

	getPorts: () => ({
		gainIn: {
			id: 'gainIn',
			x: 0,
			y: NODE_HEADER_HEIGHT_PX + NODE_ROW_HEIGHT_PX / 2 + 4,
			terminal: 'end',
		},
		output: {
			id: 'output',
			x: 235,
			y: NODE_HEADER_HEIGHT_PX / 2,
			terminal: 'start',
		},
	}),

	computeOutput: (node, inputs) => ({
		output: 1,
		gain: inputs.gainIn ?? node.gain,
	}),

	Component: ({ shape, node }) => {
		const editor = useEditor()

		const handleGainChange = (newGain: number) => {
			const clampedGain = Math.max(0, Math.min(1, newGain))
			updateNode<VCANodeType>(editor, shape, (prevNode) => ({
				...prevNode,
				gain: clampedGain,
			}))
		}

		return (
			<>
				<NodeInputRow
					shapeId={shape.id}
					portId="gainIn"
					value={node.gain}
					onChange={handleGainChange}
				/>
			</>
		)
	},
}
