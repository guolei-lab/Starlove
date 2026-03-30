# StarLove 💘 - 年轻人温暖社交微信小程序

> I人交友福音，遇见你，是最美的意外

[![Starlove](https://img.shields.io/github/stars/guolei-lab/Starlove?style=social)](https://github.com/guolei-lab/Starlove/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 项目特色

- **温暖设计**：采用温暖柔和的UI设计风格，营造舒适社交氛围
- **智能匹配**：基于兴趣和位置的智能匹配算法
- **限时聊天**：3分钟限时聊天，保护用户隐私，减轻社交压力
- **广告激励**：观看广告增加匹配次数，平衡用户体验
- **稳定可靠**：完善的错误处理和网络状态监测
- **I人友好**：轻松交友，告别尴尬

## 📱 功能特性

### ✅ 核心功能
- 微信授权登录
- 智能陌生人匹配
- 3分钟限时聊天
- 聊天结束后添加好友
- **新增** 好友列表管理
- **新增** 个人数据统计
- 每日免费匹配次数，自动重置
- 观看广告增加匹配次数

### ✅ 用户体验
- 温暖诱人的UI设计
- 流畅的加载动画
- 实时消息推送
- 网络状态监测
- 友好的错误提示
- 完善的输入验证

## 🛠️ 技术栈

### 前端
- 微信小程序原生框架
- ES6+ JavaScript
- WXML + WXSS
- 响应式设计

### 后端
- 微信云开发
- 云函数
- 云数据库

### 工程化
- ESLint 代码规范
- npm 脚本管理
- Git 版本控制

## 📁 项目结构

```
Starlove/
├── miniprogram/                 # 小程序前端代码
│   ├── pages/                   # 页面文件
│   │   ├── index/              # 🏠 首页
│   │   ├── matching/           # 👋 匹配聊天页面
│   │   ├── chat/               # 💬 好友聊天页面（新增）
│   │   └── profile/            # 👤 个人中心
│   ├── utils/                  # 🔧 工具函数
│   │   └── util.js             # 通用工具模块
│   ├── app.js                  # 小程序入口 v2.0
│   ├── app.json                # 小程序配置
│   ├── app.wxss                # 全局样式
│   └── sitemap.json            # 搜索配置
├── cloudfunctions/              # ⚙️ 云函数
│   ├── matchUser/              # 匹配用户
│   ├── sendMessage/            # 发送消息
│   ├── addFriend/              # 添加好友
│   ├── getUserInfo/            # 获取用户信息
│   └── getFriends/             # 获取好友列表（新增）
├── .eslintrc.js                 # ESLint 配置
├── .gitignore                  # Git 忽略配置
├── package.json                # 项目配置
├── project.config.json         # 微信开发者工具配置
└── README.md                   # 项目说明
```

## 🚀 快速开始

### 环境要求

- 微信开发者工具
- 微信小程序 AppID
- Node.js 14+
- 微信云开发权限

### 部署步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/guolei-lab/Starlove.git
   cd Starlove
   ```

2. **安装依赖**
   ```bash
   npm install
   # 安装所有云函数依赖
   npm run install:all
   ```

3. **导入项目**
   - 打开微信开发者工具
   - 选择"导入项目"
   - 选择项目根目录
   - 填写你的 AppID

4. **配置云开发**
   - 在微信开发者工具中开通云开发
   - 获取环境 ID
   - 在 `miniprogram/app.js` 中配置环境 ID
   ```javascript
   globalData: {
     envId: 'your-environment-id' // 替换为你的环境ID
   }
   ```

5. **配置广告位**（可选）
   - 在小程序后台申请激励视频广告位
   - 在 `miniprogram/app.js` 中配置广告位 ID
   ```javascript
   globalData: {
     adUnitId: 'your_ad_unit_id' // 替换为实际的广告位ID
   }
   ```

6. **部署云函数**
   在微信开发者工具中，右键点击每个云函数目录，选择"上传并部署"

7. **创建数据库集合**
   在云开发控制台创建以下集合：
   - `users` - 用户信息表
   - `matches` - 匹配记录表
   - `messages` - 消息记录表
   - `friends` - 好友关系表

8. **测试运行**
   - 点击微信开发者工具的"预览"
   - 扫描二维码在手机上测试

## 📊 数据库设计

### users 集合 - 用户信息
```javascript
{
  _openid: String,           // 用户openid
  nickName: String,          // 昵称
  avatarUrl: String,         // 头像
  gender: Number,           // 性别
  location: String,          // 位置
  interests: Array,         // 兴趣标签
  createTime: Date,         // 创建时间
  updateTime: Date          // 更新时间
}
```

### matches 集合 - 匹配记录
```javascript
{
  user1_openid: String,     // 用户1 openid
  user2_openid: String,     // 用户2 openid
  match_time: Date,         // 匹配时间
  status: String,           // 状态: matched/friend
  friend_time: Date        // 成为好友时间
}
```

### messages 集合 - 消息记录
```javascript
{
  from_openid: String,      // 发送者
  to_openid: String,        // 接收者
  content: String,          // 消息内容
  create_time: Date,        // 发送时间
  is_read: Boolean         // 是否已读
}
```

### friends 集合 - 好友关系
```javascript
{
  user_openid: String,      // 用户
  friend_openid: String,    // 好友
  friend_name: String,      // 好友昵称
  friend_avatar: String,    // 好友头像
  create_time: Date,        // 添加时间
  status: String           // 关系状态
}
```

## 🔧 开发配置

### 修改匹配次数限制
在 `miniprogram/app.js` 中修改：
```javascript
globalData: {
  matchCount: 10,      // 每日免费次数
  maxMatchCount: 20    // 每日最大次数
}
```

### 修改聊天时间限制
聊天限时默认为 3 分钟（180秒），可以在匹配页面修改：
```javascript
data: {
  chatTimeLeft: 180 // 单位：秒
}
```

### 添加兴趣标签
在 `miniprogram/pages/index/index.js` 中修改热门话题：
```javascript
hotTopics: [
  { id: 1, title: '你的理想型', count: 2345 },
  { id: 2, title: '周末去哪玩', count: 1892 }
  // 添加更多话题...
]
```

## 🧪 代码检查

项目集成了 ESLint 进行代码质量检查：

```bash
# 检查代码
npm run lint

# 自动修复问题
npm run fix
```

## 🚀 v2.0 升级优化内容

相比于初始版本，本次优化升级包括：

### 📦 工程化优化
- ✅ 添加 `.gitignore` 规范
- ✅ 添加 ESLint 代码规范配置
- ✅ 添加 npm 脚本管理
- ✅ 完善项目文档

### 🏗️ 代码结构优化
- ✅ 提取公共工具函数到 `utils/util.js`
- ✅ 统一错误处理和用户提示
- ✅ 模块化代码重构
- ✅ 添加防抖、节流等工具函数

### ✨ 功能增强
- ✅ 新增好友列表页面
- ✅ 新增用户数据统计
- ✅ 每日匹配次数自动重置
- ✅ 广告预加载优化
- ✅ 添加输入内容验证

### 🛡️ 安全性提升
- ✅ 添加输入长度和内容验证
- ✅ 完善错误捕获
- ✅ 防止 XSS 注入

### 🎨 用户体验优化
- ✅ 更友好的错误提示
- ✅ 优化加载状态处理
- ✅ 改进UI布局和样式
- ✅ 添加渐变和动画效果

## 🐛 常见问题

### Q: 如何修改聊天时间限制？
A: 在 `miniprogram/pages/matching/matching.js` 中修改：
```javascript
data: {
  chatTimeLeft: 180 // 改为 300 就是5分钟
}
```

### Q: 匹配次数如何自动重置？
A: 基于日期缓存，每天打开小程序会自动重置为初始次数。

### Q: 需要付费使用吗？
A: 项目完全开源免费，你可以自由部署使用。

### Q: 内容安全如何处理？
A: 建议开启微信云开发内容安全检测，对用户输入内容进行审核。

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 💖 致谢

感谢微信小程序和微信云开发提供的技术支持。

---

**StarLove - 遇见你，是最美的意外** 💘
