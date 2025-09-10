// Entry-point for Web Audio API
export class AudioContextManager {
	private static instance: AudioContextManager | null = null
	private context: AudioContext | null = null
	private nodes: Map<string, AudioNode> = new Map()

	static getInstance(): AudioContextManager {
		if (!AudioContextManager.instance) {
			AudioContextManager.instance = new AudioContextManager()
		}
		return AudioContextManager.instance
	}

	async getContext(): Promise<AudioContext> {
		if (!this.context) {
			this.context = new AudioContext()

			// Resume context on user interaction if needed
			if (this.context.state === 'suspended') {
				document.addEventListener(
					'click',
					() => {
						this.context?.resume()
					},
					{ once: true }
				)
			}
		}

		if (this.context.state === 'suspended') {
			await this.context.resume()
		}

		return this.context
	}

	registerNode(nodeId: string, audioNode: AudioNode) {
		this.nodes.set(nodeId, audioNode)
	}

	unregisterNode(nodeId: string) {
		const node = this.nodes.get(nodeId)
		if (node) {
			node.disconnect()
			this.nodes.delete(nodeId)
		}
	}

	getNode(nodeId: string): AudioNode | undefined {
		return this.nodes.get(nodeId)
	}

	async connectNodes(sourceId: string, targetId: string, sourceOutput = 0, targetInput = 0) {
		const sourceNode = this.nodes.get(sourceId)
		const targetNode = this.nodes.get(targetId)

		if (sourceNode && targetNode) {
			sourceNode.connect(targetNode, sourceOutput, targetInput)
		}
	}

	disconnectNodes(sourceId: string, targetId?: string) {
		const sourceNode = this.nodes.get(sourceId)
		if (sourceNode) {
			if (targetId) {
				const targetNode = this.nodes.get(targetId)
				if (targetNode) {
					sourceNode.disconnect(targetNode)
				}
			} else {
				sourceNode.disconnect()
			}
		}
	}
}
