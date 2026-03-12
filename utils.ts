import { TFile, TAbstractFile, Platform, moment } from 'obsidian';

/**
 * 解析路径模板，替换变量
 */
export function parsePathTemplate(template: string, sourceFile: TFile): string {
	const now = moment();
	const parent = sourceFile.parent;
	
	// 获取文件所在文件夹路径
	const folderPath = parent ? parent.path : '';
	const folderName = parent ? parent.name : '';
	
	// 获取文件路径（不含扩展名）
	const filePathWithoutExt = sourceFile.path.replace(/\.[^/.]+$/, '');
	const fileNameWithoutExt = sourceFile.basename;
	
	let result = template;
	
	// 替换变量
	const variables: Record<string, string> = {
		'{filename}': fileNameWithoutExt,
		'{filepath}': filePathWithoutExt,
		'{folder}': folderName,
		'{folderpath}': folderPath,
		'{date}': now.format('YYYYMMDD'),
		'{time}': now.format('HHmmss'),
		'{datetime}': now.format('YYYYMMDD-HHmmss'),
		'{year}': now.format('YYYY'),
		'{month}': now.format('MM'),
		'{day}': now.format('DD'),
	};
	
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
	}
	
	// 清理路径，移除开头的 ./ 和 /
	result = result.replace(/^\.\//, '').replace(/^\//, '');
	
	return result;
}

/**
 * 生成图片文件名
 */
export function generateImageFileName(originalName: string, sourceFile: TFile): string {
	const now = moment();
	const timestamp = now.format('YYYYMMDDHHmmss');
	
	// 提取原始扩展名
	const extMatch = originalName.match(/\.[^/.]+$/);
	const ext = extMatch ? extMatch[0] : '.png';
	
	// 生成新文件名：Pasted_{timestamp}_{filename}
	return `Pasted_${timestamp}_${sourceFile.basename}${ext}`;
}

/**
 * 获取文件的完整路径
 */
export function getFullPath(file: TAbstractFile): string {
	if (file instanceof TFile) {
		return file.path;
	}
	return file.path;
}

/**
 * 计算从 source 到 target 的相对路径
 */
export function getRelativePath(sourcePath: string, targetPath: string): string {
	// 分割路径
	const sourceParts = sourcePath.split('/');
	const targetParts = targetPath.split('/');
	
	// 移除文件名，只保留目录
	sourceParts.pop();
	
	// 找到共同前缀
	let commonLength = 0;
	while (commonLength < sourceParts.length && 
		   commonLength < targetParts.length && 
		   sourceParts[commonLength] === targetParts[commonLength]) {
		commonLength++;
	}
	
	// 构建相对路径
	const upCount = sourceParts.length - commonLength;
	const downParts = targetParts.slice(commonLength);
	
	const result = [];
	for (let i = 0; i < upCount; i++) {
		result.push('..');
	}
	result.push(...downParts);
	
	return result.join('/') || '.';
}

/**
 * 检查路径是否是图片
 */
export function isImagePath(path: string): boolean {
	const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
	const lowerPath = path.toLowerCase();
	return imageExtensions.some(ext => lowerPath.endsWith(ext));
}

/**
 * 解析 WikiLink 格式的图片引用
 * 支持格式：[[image.png]] 或 [[path/to/image.png|alt]]
 */
export function parseWikiLink(link: string): { path: string; alt: string } | null {
	const match = link.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
	if (!match) return null;
	
	const path = match[1];
	const alt = match[2] || '';
	
	return { path, alt };
}

/**
 * 解析 Markdown 格式的图片引用
 * 支持格式：![alt](path) 或 ![alt](path "title")
 */
export function parseMarkdownLink(link: string): { path: string; alt: string; title: string } | null {
	const match = link.match(/^!\[(.*?)\]\((.+?)(?:\s+"(.+?)")?\)$/);
	if (!match) return null;
	
	const alt = match[1] || '';
	const path = match[2];
	const title = match[3] || '';
	
	return { path, alt, title };
}

/**
 * 生成标准 Markdown 图片链接
 */
export function createMarkdownLink(alt: string, path: string, title?: string): string {
	if (title) {
		return `![${alt}](${path} "${title}")`;
	}
	return `![${alt}](${path})`;
}

/**
 * 生成 WikiLink 格式的图片链接
 */
export function createWikiLink(path: string, alt?: string): string {
	if (alt) {
		return `[[${path}|${alt}]]`;
	}
	return `[[${path}]]`;
}

/**
 * 规范化路径（处理反斜杠等）
 */
export function normalizePath(path: string): string {
	if (Platform.isWin) {
		return path.replace(/\\/g, '/');
	}
	return path;
}

/**
 * 确保路径以 .md 结尾（用于笔记文件）
 */
export function ensureMarkdownExt(path: string): string {
	if (!path.endsWith('.md')) {
		return path + '.md';
	}
	return path;
}

/**
 * 移除路径中的扩展名
 */
export function removeExtension(path: string): string {
	return path.replace(/\.[^/.]+$/, '');
}

/**
 * 编码 URL 路径中的特殊字符
 * 将空格、中文等字符转换为 %XX 格式，但保留路径分隔符 /
 */
export function encodeUrlPath(path: string): string {
	// 先按 / 分割，对每一段进行编码，然后再用 / 连接
	// 这样可以保留路径结构，同时编码每一段中的特殊字符
	return path.split('/').map(segment => {
		// 使用 encodeURIComponent 编码每一段
		// 这会编码空格、中文、特殊符号等
		return encodeURIComponent(segment);
	}).join('/');
}

/**
 * 解码 URL 路径中的特殊字符
 */
export function decodeUrlPath(path: string): string {
	return path.split('/').map(segment => {
		try {
			return decodeURIComponent(segment);
		} catch (e) {
			// 解码失败返回原字符串
			return segment;
		}
	}).join('/');
}
