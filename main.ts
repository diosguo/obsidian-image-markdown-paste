import {
	Plugin,
	TFile,
	TFolder,
	TAbstractFile,
	Editor,
	MarkdownView,
	Notice,
	Platform,
} from 'obsidian';
import { ImageMarkdownPasteSettings, DEFAULT_SETTINGS, ImageMarkdownPasteSettingTab } from './settings';
import {
	parsePathTemplate,
	generateImageFileName,
	getRelativePath,
	isImagePath,
	parseWikiLink,
	parseMarkdownLink,
	createMarkdownLink,
	normalizePath,
} from './utils';

export default class ImageMarkdownPastePlugin extends Plugin {
	settings: ImageMarkdownPasteSettings;
	
	// 用于跟踪文件操作，避免循环触发
	private isProcessing = false;
	private renameMap = new Map<string, string>();

	async onload() {
		await this.loadSettings();

		// 添加设置标签页
		this.addSettingTab(new ImageMarkdownPasteSettingTab(this.app, this));

		// 注册粘贴事件处理器
		this.registerEvent(
			this.app.workspace.on('editor-paste', this.handlePaste.bind(this))
		);

		// 注册文件重命名事件
		this.registerEvent(
			this.app.vault.on('rename', this.handleFileRename.bind(this))
		);

		// 注册文件删除事件（可选：清理未使用的图片）
		this.registerEvent(
			this.app.vault.on('delete', this.handleFileDelete.bind(this))
		);

		// 添加命令：转换当前文档中的所有图片引用
		this.addCommand({
			id: 'convert-image-references',
			name: '转换图片引用为标准 Markdown',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.convertImageReferencesInCurrentFile(editor, view);
			}
		});

		// 添加命令：整理当前文档的图片
		this.addCommand({
			id: 'organize-images',
			name: '整理当前文档的图片到配置路径',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.organizeImagesInCurrentFile(view);
			}
		});

		console.log('Image Markdown Paste plugin loaded');
	}

	onunload() {
		console.log('Image Markdown Paste plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 处理粘贴事件
	 */
	private async handlePaste(evt: ClipboardEvent, editor: Editor, view: MarkdownView) {
		// 检查剪贴板中是否有图片
		const files = evt.clipboardData?.files;
		if (!files || files.length === 0) return;

		// 检查是否有图片文件
		const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
		if (imageFiles.length === 0) return;

		// 阻止默认粘贴行为
		evt.preventDefault();

		const activeFile = view.file;
		if (!activeFile) {
			new Notice('没有活动的文件');
			return;
		}

		// 处理每个图片
		for (const imageFile of imageFiles) {
			await this.processPastedImage(imageFile, editor, activeFile);
		}
	}

	/**
	 * 处理粘贴的图片
	 */
	private async processPastedImage(
		imageFile: File, 
		editor: Editor, 
		sourceFile: TFile
	) {
		try {
			// 1. 计算目标路径
			const targetDirPath = parsePathTemplate(this.settings.imageSavePath, sourceFile);
			
			// 2. 生成图片文件名
			const imageFileName = generateImageFileName(imageFile.name, sourceFile);
			const targetPath = `${targetDirPath}/${imageFileName}`;

			// 3. 确保目标目录存在
			await this.ensureFolderExists(targetDirPath);

			// 4. 检查文件是否已存在
			let finalPath = targetPath;
			let finalFileName = imageFileName;
			
			if (await this.app.vault.adapter.exists(targetPath)) {
				if (this.settings.autoRenameOnConflict) {
					// 自动重命名
					const extMatch = imageFileName.match(/\.[^/.]+$/);
					const ext = extMatch ? extMatch[0] : '';
					const baseName = imageFileName.replace(/\.[^/.]+$/, '');
					let counter = 1;
					
					while (await this.app.vault.adapter.exists(`${targetDirPath}/${baseName}_${counter}${ext}`)) {
						counter++;
					}
					
					finalFileName = `${baseName}_${counter}${ext}`;
					finalPath = `${targetDirPath}/${finalFileName}`;
				} else {
					new Notice(`文件已存在: ${targetPath}`);
					return;
				}
			}

			// 5. 读取文件内容并保存
			const arrayBuffer = await imageFile.arrayBuffer();
			await this.app.vault.adapter.writeBinary(finalPath, arrayBuffer);

			// 6. 计算相对路径
			const relativePath = getRelativePath(sourceFile.path, finalPath);

			// 7. 插入图片引用
			const altText = finalFileName.replace(/\.[^/.]+$/, '');
			let imageLink: string;
			
			if (this.settings.useStandardMarkdown) {
				imageLink = createMarkdownLink(altText, relativePath);
			} else {
				imageLink = `[[${finalPath}|${altText}]]`;
			}

			// 8. 在编辑器中插入
			const cursor = editor.getCursor();
			editor.replaceRange(imageLink, cursor);
			
			// 移动光标到图片链接之后
			const newPos = {
				line: cursor.line,
				ch: cursor.ch + imageLink.length
			};
			editor.setCursor(newPos);

			new Notice(`图片已保存: ${finalPath}`);

		} catch (error) {
			console.error('处理粘贴图片时出错:', error);
			new Notice('处理粘贴图片时出错');
		}
	}

	/**
	 * 确保文件夹存在
	 */
	private async ensureFolderExists(path: string): Promise<void> {
		const parts = path.split('/').filter(p => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			
			const exists = await this.app.vault.adapter.exists(currentPath);
			if (!exists) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	/**
	 * 处理文件重命名事件
	 */
	private async handleFileRename(file: TAbstractFile, oldPath: string) {
		if (this.isProcessing) return;
		if (!(file instanceof TFile)) return;
		if (!file.extension || file.extension.toLowerCase() !== 'md') return;

		// 如果重命名同步被禁用，则跳过
		if (!this.settings.enableRenameSync && !this.settings.enableMoveSync) return;

		this.isProcessing = true;

		try {
			const oldFileName = oldPath.split('/').pop()?.replace(/\.md$/, '') || '';
			const newFileName = file.basename;
			const oldFolderPath = oldPath.split('/').slice(0, -1).join('/');
			const newFolderPath = file.parent?.path || '';

			// 检查是否是重命名（文件名改变）还是移动（路径改变）
			const isRename = oldFileName !== newFileName;
			const isMove = oldFolderPath !== newFolderPath;

			if (isRename && this.settings.enableRenameSync) {
				await this.handleImageRename(file, oldFileName, newFileName);
			}

			if (isMove && this.settings.enableMoveSync) {
				await this.handleImageMove(file, oldPath, oldFolderPath, newFolderPath);
			}

		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * 处理图片重命名（当文档重命名时）
	 */
	private async handleImageRename(
		file: TFile, 
		oldFileName: string, 
		newFileName: string
	) {
		// 读取文件内容
		const content = await this.app.vault.read(file);
		
		// 查找所有图片引用
		const imageRefs = this.extractImageReferences(content);
		
		let newContent = content;
		let hasChanges = false;

		for (const ref of imageRefs) {
			// 检查图片路径是否包含旧文件名
			if (ref.path.includes(oldFileName)) {
				// 尝试找到实际的图片文件
				const oldImagePath = this.resolveImagePath(ref.path, file.path);
				
				if (oldImagePath) {
					const imageFile = this.app.vault.getAbstractFileByPath(oldImagePath);
					
					if (imageFile instanceof TFile) {
						// 生成新的图片路径
						const newImagePath = oldImagePath.replace(
							new RegExp(oldFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
							newFileName
						);

						// 重命名图片文件
						if (newImagePath !== oldImagePath) {
							try {
								await this.app.fileManager.renameFile(imageFile, newImagePath);
								
								// 更新内容中的引用
								const newRelativePath = getRelativePath(file.path, newImagePath);
								newContent = this.replaceImageReference(
									newContent, 
									ref.fullMatch, 
									ref.alt || ref.path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '', 
									newRelativePath
								);
								hasChanges = true;
							} catch (error) {
								console.error(`重命名图片失败: ${oldImagePath}`, error);
							}
						}
					}
				}
			}
		}

		// 保存更新后的内容
		if (hasChanges) {
			await this.app.vault.modify(file, newContent);
			new Notice('已同步更新图片引用');
		}
	}

	/**
	 * 处理图片移动（当文档移动时）
	 */
	private async handleImageMove(
		file: TFile, 
		oldFilePath: string, 
		oldFolderPath: string, 
		newFolderPath: string
	) {
		// 读取文件内容
		const content = await this.app.vault.read(file);
		
		// 查找所有图片引用
		const imageRefs = this.extractImageReferences(content);
		
		let newContent = content;
		let hasChanges = false;

		for (const ref of imageRefs) {
			// 解析图片的绝对路径
			const oldImagePath = this.resolveImagePath(ref.path, oldFilePath);
			
			if (oldImagePath) {
				const imageFile = this.app.vault.getAbstractFileByPath(oldImagePath);
				
				if (imageFile instanceof TFile && isImagePath(oldImagePath)) {
					// 计算新的目标路径
					const newTargetDir = parsePathTemplate(this.settings.imageSavePath, file);
					const imageFileName = oldImagePath.split('/').pop() || '';
					const newImagePath = `${newTargetDir}/${imageFileName}`;

					// 如果路径没有变化，跳过
					if (newImagePath === oldImagePath) continue;

					try {
						// 确保目标目录存在
						await this.ensureFolderExists(newTargetDir);

						// 移动图片文件
						await this.app.fileManager.renameFile(imageFile, newImagePath);

						// 更新内容中的引用
						const newRelativePath = getRelativePath(file.path, newImagePath);
						newContent = this.replaceImageReference(
							newContent, 
							ref.fullMatch, 
							ref.alt || imageFileName.replace(/\.[^/.]+$/, ''), 
							newRelativePath
						);
						hasChanges = true;
					} catch (error) {
						console.error(`移动图片失败: ${oldImagePath}`, error);
					}
				}
			}
		}

		// 保存更新后的内容
		if (hasChanges) {
			await this.app.vault.modify(file, newContent);
			new Notice('已同步移动图片到新位置');
		}
	}

	/**
	 * 提取文档中的所有图片引用
	 */
	private extractImageReferences(content: string): Array<{
		fullMatch: string;
		path: string;
		alt: string;
		type: 'wikilink' | 'markdown';
	}> {
		const refs: Array<{fullMatch: string; path: string; alt: string; type: 'wikilink' | 'markdown'}> = [];

		// 匹配 WikiLink 格式: [[image.png]] 或 [[path/to/image.png|alt]]
		const wikiLinkRegex = /!\[\[(.+?)(?:\|(.+?))?\]\]/g;
		let match;
		while ((match = wikiLinkRegex.exec(content)) !== null) {
			refs.push({
				fullMatch: match[0],
				path: match[1],
				alt: match[2] || '',
				type: 'wikilink'
			});
		}

		// 匹配 Markdown 格式: ![alt](path)
		const markdownRegex = /!\[(.*?)\]\((.+?)(?:\s+".+?")?\)/g;
		while ((match = markdownRegex.exec(content)) !== null) {
			refs.push({
				fullMatch: match[0],
				alt: match[1],
				path: match[2],
				type: 'markdown'
			});
		}

		return refs;
	}

	/**
	 * 解析图片路径为绝对路径
	 */
	private resolveImagePath(imagePath: string, sourceFilePath: string): string | null {
		// 如果已经是绝对路径
		if (imagePath.startsWith('/')) {
			return imagePath.slice(1);
		}

		// 如果是以 vault 根目录开头的路径
		const abstractFile = this.app.vault.getAbstractFileByPath(imagePath);
		if (abstractFile) {
			return imagePath;
		}

		// 相对路径，需要计算
		const sourceDir = sourceFilePath.split('/').slice(0, -1).join('/');
		
		if (imagePath.startsWith('./')) {
			return sourceDir ? `${sourceDir}/${imagePath.slice(2)}` : imagePath.slice(2);
		}

		if (imagePath.startsWith('../')) {
			const parts = imagePath.split('/');
			let dirParts = sourceDir ? sourceDir.split('/') : [];
			
			for (const part of parts) {
				if (part === '..') {
					dirParts.pop();
				} else {
					dirParts.push(part);
				}
			}
			
			return dirParts.join('/');
		}

		// 假设是相对当前目录的路径
		return sourceDir ? `${sourceDir}/${imagePath}` : imagePath;
	}

	/**
	 * 替换图片引用
	 */
	private replaceImageReference(
		content: string, 
		oldRef: string, 
		alt: string, 
		newPath: string
	): string {
		// 根据设置决定使用哪种格式
		if (this.settings.useStandardMarkdown) {
			const newRef = createMarkdownLink(alt, newPath);
			return content.replace(oldRef, newRef);
		} else {
			// 使用 WikiLink 格式，但包含完整路径
			const newRef = `[[${newPath}|${alt}]]`;
			return content.replace(oldRef, newRef);
		}
	}

	/**
	 * 转换当前文件中的所有图片引用为标准 Markdown
	 */
	private async convertImageReferencesInCurrentFile(editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		const content = editor.getValue();
		const imageRefs = this.extractImageReferences(content);
		
		if (imageRefs.length === 0) {
			new Notice('未找到图片引用');
			return;
		}

		let newContent = content;
		let convertedCount = 0;

		for (const ref of imageRefs) {
			// 解析为绝对路径
			const absPath = this.resolveImagePath(ref.path, file.path);
			
			if (absPath) {
				const relativePath = getRelativePath(file.path, absPath);
				const alt = ref.alt || absPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
				
				const newRef = createMarkdownLink(alt, relativePath);
				newContent = newContent.replace(ref.fullMatch, newRef);
				convertedCount++;
			}
		}

		if (convertedCount > 0) {
			editor.setValue(newContent);
			new Notice(`已转换 ${convertedCount} 个图片引用`);
		} else {
			new Notice('没有需要转换的图片引用');
		}
	}

	/**
	 * 整理当前文档的图片到配置路径
	 */
	private async organizeImagesInCurrentFile(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		const content = await this.app.vault.read(file);
		const imageRefs = this.extractImageReferences(content);
		
		if (imageRefs.length === 0) {
			new Notice('未找到图片引用');
			return;
		}

		let newContent = content;
		let movedCount = 0;

		// 计算目标目录
		const targetDir = parsePathTemplate(this.settings.imageSavePath, file);
		await this.ensureFolderExists(targetDir);

		for (const ref of imageRefs) {
			const oldImagePath = this.resolveImagePath(ref.path, file.path);
			
			if (oldImagePath) {
				const imageFile = this.app.vault.getAbstractFileByPath(oldImagePath);
				
				if (imageFile instanceof TFile && isImagePath(oldImagePath)) {
					const imageFileName = oldImagePath.split('/').pop() || '';
					const newImagePath = `${targetDir}/${imageFileName}`;

					// 如果已经在目标位置，跳过
					if (newImagePath === oldImagePath) continue;

					try {
						// 移动图片
						await this.app.fileManager.renameFile(imageFile, newImagePath);

						// 更新引用
						const newRelativePath = getRelativePath(file.path, newImagePath);
						const alt = ref.alt || imageFileName.replace(/\.[^/.]+$/, '');
						
						newContent = this.replaceImageReference(
							newContent, 
							ref.fullMatch, 
							alt, 
							newRelativePath
						);
						
						movedCount++;
					} catch (error) {
						console.error(`移动图片失败: ${oldImagePath}`, error);
					}
				}
			}
		}

		// 保存更新后的内容
		if (movedCount > 0) {
			await this.app.vault.modify(file, newContent);
			
			// 更新编辑器内容
			const editor = view.editor;
			const cursor = editor.getCursor();
			editor.setValue(newContent);
			editor.setCursor(cursor);
			
			new Notice(`已整理 ${movedCount} 张图片到 ${targetDir}`);
		} else {
			new Notice('没有需要整理的图片');
		}
	}

	/**
	 * 处理文件删除事件
	 */
	private async handleFileDelete(file: TAbstractFile) {
		// 可以在这里添加清理未使用图片的逻辑
		// 注意：这是一个可选功能，需要谨慎实现以避免误删
	}
}
