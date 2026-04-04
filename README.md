# AI PM Portfolio - jacinda.xue

个人作品集网站，展示 AI 产品经验与思考。

## 功能特点

✨ **模块化设计**
- 首页概览
- 项目展示
- 产品测评
- 思考分享
- 推荐列表
- 成长轨迹
- 个人介绍

📱 **响应式设计**
- 完全适配移动设备
- 平滑动画过渡
- 深色友好的配色

🚀 **技术栈**
- React 18
- Tailwind CSS
- Vite
- Lucide Icons

## 快速开始

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 本地开发
\`\`\`bash
npm run dev
\`\`\`
浏览器会自动打开 http://localhost:5173

### 构建生产版本
\`\`\`bash
npm run build
\`\`\`

### 预览构建结果
\`\`\`bash
npm run preview
\`\`\`

## 自定义内容

### 修改个人信息
编辑 \`src/App.jsx\` 中的 \`profile\` 对象：
\`\`\`javascript
const profile = {
  name: "你的名字",
  title: "你的职位",
  bio: "你的简介",
  email: "你的邮箱",
  github: "你的GitHub链接",
};
\`\`\`

### 修改项目、产品、文章等内容
在 \`src/App.jsx\` 中编辑相应的数据对象：
- \`projects\` - 项目列表
- \`products\` - 产品测评
- \`posts\` - 博客文章
- \`recommendations\` - 推荐列表
- \`milestones\` - 成长轨迹

## 文件结构
\`\`\`
.
├── src/
│   ├── App.jsx          # 主应用组件
│   ├── main.jsx         # 入口文件
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── vite.config.js       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
├── postcss.config.js    # PostCSS 配置
└── package.json         # 依赖配置
\`\`\`

## 部署

### 部署到 Vercel（推荐）
1. 推送代码到 GitHub
2. 连接 Vercel 账户
3. 自动部署

### 部署到 GitHub Pages
\`\`\`bash
npm run build
# 将 dist 文件夹部署到 GitHub Pages
\`\`\`

## 许可证
MIT
