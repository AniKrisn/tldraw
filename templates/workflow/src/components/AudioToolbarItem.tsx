import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	tlmenus,
	ToolbarItem,
	useEditor,
	useValue,
} from 'tldraw'
import { AudioIcon } from './icons/AudioIcon'

export const AUDIO_MENU_ID = 'toolbar audio'

export function AudioToolbarItem() {
	const id = 'audio'
	const labelStr = 'Audio'
	const editor = useEditor()
	const isOpen = useValue('isOpen', () => tlmenus.isMenuOpen(AUDIO_MENU_ID, editor.contextId), [
		editor,
	])

	return (
		<TldrawUiPopover
			id={AUDIO_MENU_ID}
			open={isOpen}
			onOpenChange={() => {
				tlmenus.addOpenMenu(AUDIO_MENU_ID, editor.contextId)
			}}
		>
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					aria-label={labelStr}
					data-testid={`tools.${id}`}
					data-value={id}
					title={labelStr}
					type="tool"
				>
					<AudioIcon />
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="right" align="center">
				<TldrawUiToolbar label={labelStr} id={`${id}_audio`}>
					<ToolbarItem tool="node-oscillator" />
					<ToolbarItem tool="node-majorChordSlider" />
					{/* We'll add more audio nodes here later */}
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
