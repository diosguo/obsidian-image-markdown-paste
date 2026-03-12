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

		containerEl.createEl('h2', { text: 'Image Markdown Paste 设置' });

		// 图片保存路径设置
		new Setting(containerEl)
			.setName('图片保存路径')
			.setDesc(this.createPathDescription())
			.addText(text => text
				.setPlaceholder('attachments/{filename}')
				.setValue(this.plugin.settings.imageSavePath)
				.onChange(async (value) => {
					this.plugin.settings.imageSavePath = value || DEFAULT_SETTINGS.imageSavePath;
					await this.plugin.saveSettings();
				}));

		// 使用标准 Markdown 格式
		new Setting(containerEl)
			.setName('使用标准 Markdown 格式')
			.setDesc('启用后，图片引用将使用标准的 Markdown 格式 ![alt](path)，而不是 WikiLink 格式 [[path]]')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useStandardMarkdown)
				.onChange(async (value) => {
					this.plugin.settings.useStandardMarkdown = value;
					await this.plugin.saveSettings();
				}));

		// 自动重命名冲突文件
		new Setting(containerEl)
			.setName('文件名冲突时自动重命名')
			.setDesc('当目标位置已存在同名文件时，自动添加序号重命名')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRenameOnConflict)
				.onChange(async (value) => {
					this.plugin.settings.autoRenameOnConflict = value;
					await this.plugin.saveSettings();
				}));

		// 文件重命名同步
		new Setting(containerEl)
			.setName('启用重命名同步')
			.setDesc('当文档重命名时，自动同步重命名文档中引用的图片（仅当路径包含 {filename} 变量时）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRenameSync)
				.onChange(async (value) => {
					this.plugin.settings.enableRenameSync = value;
					await this.plugin.saveSettings();
				}));

		// 文件移动同步
		new Setting(containerEl)
			.setName('启用移动同步')
			.setDesc('当文档移动到其他位置时，自动将相关图片移动到更新后的位置')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMoveSync)
				.onChange(async (value) => {
					this.plugin.settings.enableMoveSync = value;
					await this.plugin.saveSettings();
				}));

		// 添加变量说明
		containerEl.createEl('h3', { text: '可用变量' });
		const varList = containerEl.createEl('ul');
		const variables = [
			{ name: '{filename}', desc: '当前文档的文件名（不含扩展名）' },
			{ name: '{filepath}', desc: '当前文档的完整路径（不含扩展名）' },
			{ name: '{folder}', desc: '当前文档所在文件夹名称' },
			{ name: '{folderpath}', desc: '当前文档所在文件夹的完整路径' },
			{ name: '{date}', desc: '当前日期（YYYYMMDD）' },
			{ name: '{time}', desc: '当前时间（HHmmss）' },
			{ name: '{datetime}', desc: '当前日期时间（YYYYMMDD-HHmmss）' },
			{ name: '{year}', desc: '当前年份' },
			{ name: '{month}', desc: '当前月份' },
			{ name: '{day}', desc: '当前日期' },
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
		const code = frag.createEl('code', { text: 'attachments/{filename}' });
		code.style.backgroundColor = 'var(--background-modifier-hover)';
		code.style.padding = '2px 4px';
		code.style.borderRadius = '4px';
		frag.appendText(' 会将图片保存到与文档同名的子文件夹中');
		return frag;
	}
}
