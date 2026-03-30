# 温暖社交（陌生人随机匹配聊天小程序）

已落地一个可运行的 MVP：登录 -> 匹配 -> 陌生人聊天（3 分钟）-> 添加好友 -> 个人页查看匹配记录。

## 当前实现

- 小程序页面：`index`、`matching`、`chat`、`profile`
- 云函数：`socialApi`（统一 API 入口）
- 云数据库集合：
  - `users` 用户资料
  - `rooms` 匹配会话
  - `messages` 聊天消息
  - `friends` 好友关系
  - `blocks` 拉黑记录
  - `reports` 举报记录

## 项目结构

```txt
young-social/
├── miniprogram/
│   ├── pages/
│   │   ├── index/
│   │   ├── matching/
│   │   ├── chat/
│   │   └── profile/
│   ├── utils/
│   │   ├── util.js
│   │   └── api.js
│   ├── app.js
│   └── app.json
├── cloudfunctions/
│   └── socialApi/
│       ├── index.js
│       └── package.json
└── README.md
```

## 一次性部署步骤（可直接执行）

1. 使用微信开发者工具导入项目根目录
2. 开通云开发并创建环境
3. 修改 `miniprogram/app.js` 中 `cloudEnvId`（可填环境 ID）
4. 在 `cloudfunctions/socialApi` 目录安装依赖并上传部署
5. 在云数据库创建集合：
   - `users`、`rooms`、`messages`、`friends`、`blocks`、`reports`
6. 建议给集合设置安全规则：
   - 仅云函数可写
   - 前端不直接读写集合
7. 编译运行小程序

## 云函数 API 动作清单

`socialApi` 通过 `action` 区分接口：

- `ensureUser`：创建/更新登录用户
- `joinMatch`：匹配陌生人并创建会话
- `getRoom`：获取会话与匹配对象
- `sendMessage`：发送消息
- `getMessages`：拉取消息列表
- `addFriend`：添加好友（双向）
- `listMatchHistory`：个人页匹配记录
- `blockUser`：拉黑用户
- `reportUser`：举报用户

## 验收流程

1. 首次授权登录后进入首页
2. 点击开始匹配，进入匹配页并返回匹配结果
3. 进入聊天页，发送消息成功并能刷新看到记录
4. 倒计时结束后可添加好友
5. 进入个人中心可看到匹配记录并再次进入会话

## 后续建议（下一迭代）

- 接入 WebSocket 实时推送（当前为轮询拉取）
- 接入微信内容安全接口（消息审核）
- 增加举报处理后台与封禁策略
- 增加防重复匹配和更精细的匹配权重

## 线上运营文档

- `DEPLOYMENT.md`：部署步骤
- `ONLINE_OPS_GUIDE.md`：运营版配置、索引、风控、告警、值班建议