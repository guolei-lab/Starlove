# 线上运营版实施指南

本文件用于把当前项目从 MVP 提升到可线上运营。

## 1. 生产环境拓扑建议

- 云开发环境拆分：`dev` / `staging` / `prod`
- 每个环境独立数据库与云函数
- 小程序体验版走 `staging`，正式版走 `prod`
- 所有写操作只允许云函数，客户端禁止直写数据库

## 2. 已具备的运营能力

- 好友申请（双向同意）
- 聊天频控（每分钟限流）
- 匹配频控（每分钟限流）
- 关键词风控拦截（基础敏感词）
- 举报工单入库（`reports`）
- 拉黑隔离（`blocks`）
- 广告位软频控（按页面场景最小间隔展示）
- 广告策略远程配置（`getPublicConfig` + `app_configs.public_config`）
- 实时消息（云数据库 watch）+ 轮询兜底
- 运营后台（举报处理、用户状态处罚、敏感词管理）

## 3. 必建集合

- `users`
- `rooms`
- `messages`
- `friends`
- `friend_requests`
- `blocks`
- `reports`
- `rate_limits`
- `app_configs`（可选，推荐）
- `admin_users`
- `sensitive_words`
- `moderation_tasks`

## 3.1 广告远程配置示例

在 `app_configs` 新增一条文档：

- `key`: `public_config`
- `value`:

```json
{
  "ad": {
    "enableBanner": true,
    "enableVideoReward": true,
    "minIntervalSec": 90,
    "placements": {
      "indexBanner": "adunit-xxxx1",
      "matchingBanner": "adunit-xxxx2",
      "chatEndBanner": "adunit-xxxx3",
      "profileBanner": "adunit-xxxx4",
      "feedBanner": "adunit-xxxx5"
    }
  }
}
```

说明：广告策略可不发版直接调整，便于运营活动和 A/B 测试。

## 4. 必建索引（云数据库控制台）

为了避免线上慢查询，建议建立组合索引：

- `rooms`: `user1OpenId + status + expireAt`
- `rooms`: `user2OpenId + status + expireAt`
- `messages`: `roomId + createdAt`
- `friends`: `userOpenId + friendOpenId`
- `friend_requests`: `toOpenId + status + createdAt`
- `friend_requests`: `fromOpenId + status + createdAt`
- `blocks`: `userOpenId + targetOpenId`
- `rate_limits`: `key`（唯一）

## 5. 云函数配置建议

- 函数超时：10s（默认不足时提高到 20s）
- 最小实例：1（减少冷启动）
- 日志保留：至少 30 天
- 开启告警：错误率、超时数、调用量突增

## 6. 运营风控策略

### 6.1 文本内容
- 当前关键词命中直接拦截
- 建议接入微信内容安全接口做二级审核

### 6.2 行为风控
- `joinMatch`：每分钟上限 12 次
- `sendMessage`：每分钟上限 30 条
- 举报超阈值（如 24h 内 >=3）自动打标高风险

### 6.3 处罚分级
- 轻度：限流
- 中度：禁言（`users.status = mute`）
- 重度：封禁（`users.status = banned`）

## 7. 上线前检查单

- [ ] 生产环境 `cloudEnvId` 已配置
- [ ] 云函数已部署 prod 环境
- [ ] 集合与索引已创建
- [ ] 数据权限已改为“仅云函数写”
- [ ] 敏感词列表已更新
- [ ] 日志与告警已配置
- [ ] 预案文档完成（故障回滚、风控突发）

## 8. 运维值班与应急

- 每日巡检：
  - 举报量
  - 云函数错误率
  - 匹配成功率
- 应急开关（建议后续新增配置集合）：
  - 关闭匹配入口
  - 全局禁言
  - 临时白名单

## 9. 下一个版本建议

- 支持图片消息 + 内容审核
- 匹配算法升级（等待时长权重 + 风险降权）

## 10. 管理员初始化

新增集合：`admin_users`

插入管理员记录示例：

```json
{
  "openid": "管理员openid",
  "enabled": true,
  "role": "super_admin",
  "createdAt": "2026-03-25T00:00:00.000Z"
}
```

只有在 `admin_users` 中且 `enabled=true` 的用户可以进入“运营后台”页面。

## 11. 最终线上版新增能力

- 图片消息（上传到云存储，消息支持 `image` 类型）
- 图片审核队列（`moderation_tasks`）
- 审核结果回写消息状态（通过/驳回）
- 举报工单流转状态（`flowStatus`）
- 7日趋势看板（新增用户/会话/举报）
- 数据库权限模板文档：`DB_RULES_TEMPLATE.md`
