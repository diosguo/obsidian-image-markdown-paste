# Image Markdown Paste

[English](#english) | [中文](#中文)

---

<a name="中文"></a>
## 中文

一个 Obsidian 插件，用于自定义粘贴图片的行为，支持动态路径和标准的 Markdown 图片引用格式。

### 功能特性

1. **自定义图片保存路径**
   - 支持使用变量动态生成图片保存路径
   - 自动创建目标目录
   - 文件名冲突时自动重命名

2. **标准 Markdown 格式**
   - 将 WikiLink 格式（`[[image.png]]`）转换为标准 Markdown 格式（`![alt](path)`）
   - 使用相对路径引用图片，确保在其他 Markdown 工具中正常显示

3. **文件重命名同步**
   - 当文档重命名时，自动同步重命名引用的图片（当路径包含 `{filename}` 变量时）

4. **文件移动同步**
   - 当文档移动到其他位置时，自动将相关图片移动到新的配置路径

### 可用变量

在配置图片保存路径时，可以使用以下变量：

| 变量 | 说明 |
|------|------|
| `{filename}` | 当前文档的文件名（不含扩展名） |
| `{filepath}` | 当前文档的完整路径（不含扩展名） |
| `{folder}` | 当前文档所在文件夹名称 |
| `{folderpath}` | 当前文档所在文件夹的完整路径 |
| `{date}` | 当前日期（YYYYMMDD） |
| `{time}` | 当前时间（HHmmss） |
| `{datetime}` | 当前日期时间（YYYYMMDD-HHmmss） |
| `{year}` | 当前年份 |
| `{month}` | 当前月份 |
| `{day}` | 当前日期 |

### 配置示例

```
attachments/{filename}
```
图片将保存到 `attachments/文档名/` 目录下

```
{folderpath}/images/{date}
```
图片将保存到与文档同级的 `images/20240312/` 目录下

```
assets/{year}/{month}/{filename}
```
图片将保存到 `assets/2024/03/文档名/` 目录下

### 安装方法

#### 手动安装

1. 下载最新版本的发布包
2. 解压到 Obsidian 仓库的 `.obsidian/plugins/` 目录下
3. 在 Obsidian 设置中启用插件

#### 通过 Obsidian 社区插件市场

（等待上架中...）

### 使用方法

1. **粘贴图片**
   - 直接复制图片并粘贴到文档中
   - 插件会自动将图片保存到配置的路径，并插入标准 Markdown 格式的引用

2. **转换现有图片引用**
   - 使用命令面板（Ctrl/Cmd + P）
   - 搜索 "Image Markdown Paste: 转换图片引用为标准 Markdown"
   - 执行命令将当前文档中的所有图片引用转换为标准格式

3. **整理图片**
   - 使用命令面板
   - 搜索 "Image Markdown Paste: 整理当前文档的图片到配置路径"
   - 执行命令将当前文档中的所有图片移动到配置的保存路径

### 设置选项

- **图片保存路径**: 设置粘贴图片的保存位置，支持变量
- **使用标准 Markdown 格式**: 启用后使用 `![alt](path)` 格式，禁用则使用 WikiLink 格式
- **文件名冲突时自动重命名**: 当目标位置已存在同名文件时自动添加序号
- **启用重命名同步**: 文档重命名时同步更新图片名称
- **启用移动同步**: 文档移动时同步移动图片位置

---

<a name="english"></a>
## English

An Obsidian plugin for customizing image paste behavior with dynamic paths and standard Markdown image references.

### Features

1. **Custom Image Save Path**
   - Support variables for dynamic path generation
   - Auto-create target directories
   - Auto-rename on filename conflicts

2. **Standard Markdown Format**
   - Convert WikiLink format (`[[image.png]]`) to standard Markdown format (`![alt](path)`)
   - Use relative paths to ensure images display correctly in other Markdown tools

3. **File Rename Synchronization**
   - Automatically rename referenced images when a document is renamed (when path contains `{filename}` variable)

4. **File Move Synchronization**
   - Automatically move related images to the new configured path when a document is moved

### Available Variables

When configuring the image save path, you can use the following variables:

| Variable | Description |
|----------|-------------|
| `{filename}` | Current document filename (without extension) |
| `{filepath}` | Full path of current document (without extension) |
| `{folder}` | Name of the folder containing the document |
| `{folderpath}` | Full path of the folder containing the document |
| `{date}` | Current date (YYYYMMDD) |
| `{time}` | Current time (HHmmss) |
| `{datetime}` | Current date and time (YYYYMMDD-HHmmss) |
| `{year}` | Current year |
| `{month}` | Current month |
| `{day}` | Current day |

### Configuration Examples

```
attachments/{filename}
```
Images will be saved to `attachments/DocumentName/` directory

```
{folderpath}/images/{date}
```
Images will be saved to `images/20240312/` directory at the same level as the document

```
assets/{year}/{month}/{filename}
```
Images will be saved to `assets/2024/03/DocumentName/` directory

### Installation

#### Manual Installation

1. Download the latest release package
2. Extract to your Obsidian vault's `.obsidian/plugins/` directory
3. Enable the plugin in Obsidian settings

#### Via Obsidian Community Plugin Marketplace

(Coming soon...)

### Usage

1. **Paste Images**
   - Simply copy and paste images into your document
   - The plugin will automatically save images to the configured path and insert standard Markdown references

2. **Convert Existing Image References**
   - Open the command palette (Ctrl/Cmd + P)
   - Search for "Image Markdown Paste: Convert image references to standard Markdown"
   - Execute the command to convert all image references in the current document

3. **Organize Images**
   - Open the command palette
   - Search for "Image Markdown Paste: Organize images in current file to configured path"
   - Execute the command to move all images to the configured save path

### Settings

- **Image Save Path**: Set the location for pasted images, supports variables
- **Use Standard Markdown Format**: When enabled, uses `![alt](path)` format; when disabled, uses WikiLink format
- **Auto Rename on Conflict**: Automatically add sequence numbers when a file with the same name exists
- **Enable Rename Sync**: Update image names when documents are renamed
- **Enable Move Sync**: Move images when documents are moved

---

## License

MIT License
