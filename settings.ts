import { App, PluginSettingTab, Setting } from 'obsidian';
import ImageMarkdownPastePlugin from './main';

export interface ImageMarkdownPasteSettings {
	// 图片保存路径模板
	imageSavePath: string;
	// 是否使用标准 Markdown 格式（而不是 WikiLink）
	useStandardMarkdown: boolean;
	// 是否在文件名冲突时自动重命名
	autoRenameOnConflict: boolean;
	// 是否启用文件重命名时同步重命名图片
	enableRenameSync: boolean;
	// 是否启用文件移动时同步移动图片
	enableMoveSync: boolean;
}

export const DEFAULT_SETTINGS: ImageMarkdownPasteSettings = {
	imageSavePath: 'attachments/{filename}',
	useStandardMarkdown: true,
	autoRenameOnConflict: true,
	enableRenameSync: true,
	enableMoveSync: true,
};

export class ImageMarkdownPasteSettingTab extends PluginSettingTab {
	plugin: ImageMarkdownPastePlugin;

	constructor(app: App, plugin: ImageMarkdownPastePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Image save path setting
		new Setting(containerEl)
			.setName('Image save path')
			.setDesc(this.createPathDescription())
			.addText(text => text
				.setPlaceholder('attachments/{filename}')
				.setValue(this.plugin.settings.imageSavePath)
				.onChange((value) => {
					this.plugin.settings.imageSavePath = value || DEFAULT_SETTINGS.imageSavePath;
					void this.plugin.saveSettings();
				}));

		// Use standard Markdown format
		new Setting(containerEl)
			.setName('Use standard Markdown format')
			.setDesc('When enabled, image references will use standard Markdown format ![alt](path) instead of WikiLink format [[path]]')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useStandardMarkdown)
				.onChange((value) => {
					this.plugin.settings.useStandardMarkdown = value;
					void this.plugin.saveSettings();
				}));

		// Auto rename on conflict
		new Setting(containerEl)
			.setName('Auto rename on conflict')
			.setDesc('Automatically add sequence numbers when a file with the same name exists in the target location')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRenameOnConflict)
				.onChange((value) => {
					this.plugin.settings.autoRenameOnConflict = value;
					void this.plugin.saveSettings();
				}));

		// Enable rename sync
		new Setting(containerEl)
			.setName('Enable rename sync')
			.setDesc('Automatically rename referenced images when document is renamed (only when path contains {filename} variable)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRenameSync)
				.onChange((value) => {
					this.plugin.settings.enableRenameSync = value;
					void this.plugin.saveSettings();
				}));

		// Enable move sync
		new Setting(containerEl)
			.setName('Enable move sync')
			.setDesc('Automatically move related images to the updated location when document is moved')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMoveSync)
				.onChange((value) => {
					this.plugin.settings.enableMoveSync = value;
					void this.plugin.saveSettings();
				}));

		// Add variable description
		new Setting(containerEl)
			.setName('Available variables')
			.setHeading();

		const varList = containerEl.createEl('ul');
		const variables = [
			{ name: '{filename}', desc: 'Current document filename (without extension)' },
			{ name: '{filepath}', desc: 'Full path of current document (without extension)' },
			{ name: '{folder}', desc: 'Name of the folder containing the document' },
			{ name: '{folderpath}', desc: 'Full path of the folder containing the document' },
			{ name: '{date}', desc: 'Current date (YYYYMMDD)' },
			{ name: '{time}', desc: 'Current time (HHmmss)' },
			{ name: '{datetime}', desc: 'Current date and time (YYYYMMDD-HHmmss)' },
			{ name: '{year}', desc: 'Current year' },
			{ name: '{month}', desc: 'Current month' },
			{ name: '{day}', desc: 'Current day' },
		];
		variables.forEach(v => {
			const li = varList.createEl('li');
			li.createEl('code', { text: v.name });
			li.appendText(` - ${v.desc}`);
		});
	}

	private createPathDescription(): DocumentFragment {
		const frag = document.createDocumentFragment();
		frag.appendText('设置粘贴图片的保存路径，支持使用变量。例如：');
		frag.appendChild(document.createElement('br'));
		frag.createEl('code', { 
			text: 'attachments/{filename}',
			cls: 'image-markdown-paste-code'
		});
		frag.appendText(' 会将图片保存到与文档同名的子文件夹中');
		return frag;
	}
}
