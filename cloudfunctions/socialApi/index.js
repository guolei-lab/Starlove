const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const COLLECTIONS = {
  users: "users",
  rooms: "rooms",
  messages: "messages",
  friends: "friends",
  blocks: "blocks",
  reports: "reports",
  friendRequests: "friend_requests",
  rateLimits: "rate_limits",
  appConfigs: "app_configs"
};

const RISK_WORDS = ["微信", "vx", "v信", "加我", "裸聊", "兼职刷单", "赌博", "约炮"];
let sensitiveWordsCache = {
  words: [],
  expireAt: 0
};

function ok(data = {}, message = "ok") {
  return { success: true, message, data };
}

function fail(message = "请求失败") {
  return { success: false, message, data: null };
}

function normalizeText(text) {
  return String(text || "").trim();
}

function containsRiskWord(text) {
  const input = normalizeText(text).toLowerCase();
  return RISK_WORDS.find((w) => input.includes(w.toLowerCase())) || "";
}

async function getSensitiveWords() {
  const now = Date.now();
  if (sensitiveWordsCache.expireAt > now && sensitiveWordsCache.words.length) {
    return sensitiveWordsCache.words;
  }
  try {
    const res = await db
      .collection("sensitive_words")
      .where({ enabled: true })
      .limit(200)
      .get();
    const words = res.data.map((it) => normalizeText(it.word)).filter(Boolean);
    sensitiveWordsCache = { words, expireAt: now + 60 * 1000 };
    return words;
  } catch (e) {
    return [];
  }
}

async function hitSensitiveWord(text) {
  const words = [...RISK_WORDS, ...(await getSensitiveWords())];
  const input = normalizeText(text).toLowerCase();
  return words.find((w) => input.includes(w.toLowerCase())) || "";
}

async function checkUserStatus(openid) {
  const user = await getUserByOpenId(openid);
  if (!user) return fail("请先登录");
  if (user.status === "banned") return fail("账号已封禁");
  return ok({ user });
}

async function checkCanSendMessage(openid) {
  const user = await getUserByOpenId(openid);
  if (!user) return fail("请先登录");
  if (user.status === "banned") return fail("账号已封禁");
  if (user.status === "mute") return fail("账号已禁言");
  return ok({ user });
}

async function checkRateLimit(openid, action, limit, windowSec) {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000)) * windowSec * 1000;
  const key = `${openid}:${action}:${windowStart}`;
  const row = await db.collection(COLLECTIONS.rateLimits).where({ key }).limit(1).get();
  if (!row.data.length) {
    await db.collection(COLLECTIONS.rateLimits).add({
      data: {
        key,
        openid,
        action,
        count: 1,
        windowStart: new Date(windowStart),
        expireAt: new Date(windowStart + windowSec * 1000),
        createdAt: new Date()
      }
    });
    return ok();
  }

  const current = row.data[0];
  if (current.count >= limit) {
    return fail("操作过于频繁，请稍后再试");
  }
  await db.collection(COLLECTIONS.rateLimits).doc(current._id).update({
    data: { count: _.inc(1), updatedAt: new Date() }
  });
  return ok();
}

async function getPublicConfig() {
  const defaults = {
    ad: {
      enableBanner: true,
      enableVideoReward: true,
      minIntervalSec: 90,
      placements: {
        indexBanner: "adunit-index-banner",
        matchingBanner: "adunit-matching-banner",
        chatEndBanner: "adunit-chat-end-banner",
        profileBanner: "adunit-profile-banner",
        feedBanner: "adunit-feed-banner"
      }
    },
    risk: {
      messagePerMinute: 30,
      matchPerMinute: 12
    }
  };
  try {
    const row = await db
      .collection(COLLECTIONS.appConfigs)
      .where({ key: "public_config" })
      .limit(1)
      .get();
    if (!row.data.length) return ok({ config: defaults });
    return ok({ config: { ...defaults, ...row.data[0].value } });
  } catch (e) {
    return ok({ config: defaults });
  }
}

async function getUserByOpenId(openid) {
  const res = await db.collection(COLLECTIONS.users).where({ _openid: openid }).limit(1).get();
  return res.data[0] || null;
}

async function ensureUser(openid, profile = {}) {
  const existing = await getUserByOpenId(openid);
  const payload = {
    nickName: profile.nickName || existing?.nickName || "微信用户",
    avatarUrl: profile.avatarUrl || existing?.avatarUrl || "",
    gender: profile.gender || existing?.gender || 0,
    location: profile.location || existing?.location || "",
    interests: profile.interests || existing?.interests || [],
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    status: "active"
  };

  if (existing) {
    await db.collection(COLLECTIONS.users).doc(existing._id).update({ data: payload });
    return { ...existing, ...payload };
  }

  const created = await db.collection(COLLECTIONS.users).add({
    data: {
      ...payload,
      createdAt: new Date()
    }
  });
  return { _id: created._id, _openid: openid, ...payload };
}

async function getBlockPairs(openid) {
  const blocks = await db
    .collection(COLLECTIONS.blocks)
    .where(_.or([{ userOpenId: openid }, { targetOpenId: openid }]))
    .get();
  return new Set(
    blocks.data.map((it) => (it.userOpenId === openid ? it.targetOpenId : it.userOpenId))
  );
}

async function findActiveRoomByUser(openid) {
  const now = new Date();
  const roomRes = await db
    .collection(COLLECTIONS.rooms)
    .where(
      _.and([
        _.or([{ user1OpenId: openid }, { user2OpenId: openid }]),
        { status: "active" },
        { expireAt: _.gt(now) }
      ])
    )
    .limit(1)
    .get();
  return roomRes.data[0] || null;
}

async function joinMatch(openid, preferences = {}) {
  const userCheck = await checkUserStatus(openid);
  if (!userCheck.success) return userCheck;
  const rate = await checkRateLimit(openid, "joinMatch", 12, 60);
  if (!rate.success) return rate;

  const activeRoom = await findActiveRoomByUser(openid);
  if (activeRoom) {
    const peerOpenId =
      activeRoom.user1OpenId === openid ? activeRoom.user2OpenId : activeRoom.user1OpenId;
    const peer = await getUserByOpenId(peerOpenId);
    return ok({
      roomId: activeRoom._id,
      expireAt: activeRoom.expireAt,
      matchedUser: {
        openid: peerOpenId,
        nickName: peer?.nickName || "微信用户",
        avatarUrl: peer?.avatarUrl || "",
        interests: peer?.interests || [],
        location: peer?.location || ""
      }
    });
  }

  const blockedSet = await getBlockPairs(openid);
  const users = await db.collection(COLLECTIONS.users).where({ status: "active" }).limit(100).get();
  const candidates = users.data.filter((u) => {
    if (u._openid === openid) return false;
    if (blockedSet.has(u._openid)) return false;
    if (preferences.gender && u.gender && preferences.gender !== u.gender) return false;
    return true;
  });

  if (!candidates.length) {
    return fail("暂时没有可匹配用户，请稍后再试");
  }

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const targetActiveRoom = await findActiveRoomByUser(target._openid);
  if (targetActiveRoom) {
    return fail("正在为你寻找更合适的用户，请重试");
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + 3 * 60 * 1000);
  const roomRes = await db.collection(COLLECTIONS.rooms).add({
    data: {
      user1OpenId: openid,
      user2OpenId: target._openid,
      user1AcceptedFriend: false,
      user2AcceptedFriend: false,
      status: "active",
      createdAt: now,
      expireAt
    }
  });

  return ok({
    roomId: roomRes._id,
    expireAt,
    matchedUser: {
      openid: target._openid,
      nickName: target.nickName || "微信用户",
      avatarUrl: target.avatarUrl || "",
      interests: target.interests || [],
      location: target.location || ""
    }
  }, "匹配成功");
}

async function getRoom(openid, roomId) {
  const room = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  if (!room.data) return fail("会话不存在");
  const row = room.data;
  if (row.user1OpenId !== openid && row.user2OpenId !== openid) return fail("无权限");
  const peerOpenId = row.user1OpenId === openid ? row.user2OpenId : row.user1OpenId;
  const peer = await getUserByOpenId(peerOpenId);
  const pending = await db
    .collection(COLLECTIONS.friendRequests)
    .where(
      _.and([
        _.or([
          { fromOpenId: openid, toOpenId: peerOpenId },
          { fromOpenId: peerOpenId, toOpenId: openid }
        ]),
        { sourceRoomId: roomId },
        { status: "pending" }
      ])
    )
    .limit(1)
    .get();
  return ok({
    roomId: row._id,
    status: row.status,
    expireAt: row.expireAt,
    hasPendingRequest: pending.data.length > 0,
    matchedUser: {
      openid: peerOpenId,
      nickName: peer?.nickName || "微信用户",
      avatarUrl: peer?.avatarUrl || "",
      interests: peer?.interests || [],
      location: peer?.location || ""
    }
  });
}

async function sendMessage(openid, roomId, content) {
  return sendRichMessage(openid, roomId, "text", { content });
}

async function sendRichMessage(openid, roomId, msgType, payload = {}) {
  const userCheck = await checkCanSendMessage(openid);
  if (!userCheck.success) return userCheck;
  const rate = await checkRateLimit(openid, "sendMessage", 30, 60);
  if (!rate.success) return rate;
  const roomRes = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  const room = roomRes.data;
  if (!room) return fail("会话不存在");
  if (room.user1OpenId !== openid && room.user2OpenId !== openid) return fail("无权限");

  const now = new Date();
  if (room.expireAt < now || room.status !== "active") {
    return fail("聊天已结束");
  }

  const peerOpenId = room.user1OpenId === openid ? room.user2OpenId : room.user1OpenId;
  const blocked = await db
    .collection(COLLECTIONS.blocks)
    .where(
      _.or([
        { userOpenId: openid, targetOpenId: peerOpenId },
        { userOpenId: peerOpenId, targetOpenId: openid }
      ])
    )
    .limit(1)
    .get();
  if (blocked.data.length) return fail("你与对方已拉黑，无法发送");

  let content = "";
  let mediaUrl = "";
  let reviewStatus = "pass";

  if (msgType === "text") {
    content = normalizeText(payload.content);
    if (!content) return fail("消息不能为空");
    if (content.length > 500) return fail("单条消息不能超过 500 字");
    const riskWord = await hitSensitiveWord(content);
    if (riskWord) {
      await db.collection(COLLECTIONS.reports).add({
        data: {
          auto: true,
          reporterOpenId: openid,
          targetOpenId: peerOpenId,
          roomId,
          reason: "sensitive_word",
          detail: `命中敏感词:${riskWord}`,
          status: "pending",
          flowStatus: "pending_review",
          createdAt: now
        }
      });
      return fail("消息包含敏感内容，发送失败");
    }
  } else if (msgType === "image") {
    mediaUrl = normalizeText(payload.mediaUrl);
    if (!mediaUrl) return fail("图片不能为空");
    reviewStatus = "pending";
  } else {
    return fail("不支持的消息类型");
  }

  const save = await db.collection(COLLECTIONS.messages).add({
    data: {
      roomId,
      fromOpenId: openid,
      toOpenId: peerOpenId,
      msgType,
      content,
      mediaUrl,
      reviewStatus,
      createdAt: now
    }
  });
  if (msgType === "image") {
    await db.collection("moderation_tasks").add({
      data: {
        messageId: save._id,
        roomId,
        fromOpenId: openid,
        toOpenId: peerOpenId,
        mediaUrl,
        status: "pending",
        createdAt: now
      }
    });
  }
  return ok({ messageId: save._id, createdAt: now, reviewStatus }, "发送成功");
}

async function isAdmin(openid) {
  const admin = await db.collection("admin_users").where({ openid, enabled: true }).limit(1).get();
  return admin.data[0] || null;
}

async function adminGuard(openid) {
  const admin = await isAdmin(openid);
  if (!admin) return fail("无管理员权限");
  return ok({ admin });
}

async function adminGetOverview(openid) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const [pendingReports, userCount, roomCount] = await Promise.all([
    db.collection(COLLECTIONS.reports).where({ status: "pending" }).count(),
    db.collection(COLLECTIONS.users).count(),
    db.collection(COLLECTIONS.rooms).count()
  ]);
  return ok({
    pendingReports: pendingReports.total || 0,
    userCount: userCount.total || 0,
    roomCount: roomCount.total || 0
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function adminGetTrends(openid, days = 7) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const size = Math.min(Math.max(Number(days) || 7, 1), 30);
  const now = new Date();
  const points = [];
  for (let i = size - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const start = startOfDay(day);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const [newUsers, newRooms, newReports] = await Promise.all([
      db.collection(COLLECTIONS.users).where(_.and([{ createdAt: _.gte(start) }, { createdAt: _.lt(end) }])).count(),
      db.collection(COLLECTIONS.rooms).where(_.and([{ createdAt: _.gte(start) }, { createdAt: _.lt(end) }])).count(),
      db.collection(COLLECTIONS.reports).where(_.and([{ createdAt: _.gte(start) }, { createdAt: _.lt(end) }])).count()
    ]);
    points.push({
      date: `${start.getMonth() + 1}/${start.getDate()}`,
      newUsers: newUsers.total || 0,
      newRooms: newRooms.total || 0,
      newReports: newReports.total || 0
    });
  }
  return ok({ points });
}

async function adminListReports(openid, status = "pending") {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const where = status === "all" ? {} : { status };
  const reports = await db
    .collection(COLLECTIONS.reports)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  const list = [];
  for (const item of reports.data) {
    const target = await getUserByOpenId(item.targetOpenId);
    const reporter = await getUserByOpenId(item.reporterOpenId);
    list.push({
      id: item._id,
      targetOpenId: item.targetOpenId,
      targetName: target?.nickName || "未知用户",
      reporterName: reporter?.nickName || "匿名",
      reason: item.reason,
      detail: item.detail || "",
      status: item.status,
      flowStatus: item.flowStatus || "pending_review",
      createdAt: item.createdAt
    });
  }
  return ok({ list });
}

async function adminHandleReport(openid, reportId, decision, remark = "", action = "none") {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const rep = await db.collection(COLLECTIONS.reports).doc(reportId).get();
  if (!rep.data) return fail("举报不存在");
  if (rep.data.status !== "pending") return fail("举报已处理");
  const next = decision === "reject" ? "rejected" : "resolved";
  let flowStatus = "rejected";
  if (decision !== "reject") {
    if (action === "ban") flowStatus = "punished_ban";
    else if (action === "mute") flowStatus = "punished_mute";
    else flowStatus = "resolved_no_action";
  }
  await db.collection(COLLECTIONS.reports).doc(reportId).update({
    data: {
      status: next,
      flowStatus,
      handledAt: new Date(),
      handledBy: openid,
      remark: normalizeText(remark).slice(0, 120)
    }
  });
  if (decision !== "reject" && (action === "ban" || action === "mute")) {
    const targetOpenId = rep.data.targetOpenId;
    const target = await getUserByOpenId(targetOpenId);
    if (target) {
      await db.collection(COLLECTIONS.users).doc(target._id).update({
        data: { status: action === "ban" ? "banned" : "mute", updatedAt: new Date() }
      });
    }
  }
  return ok({}, "举报处理成功");
}

async function adminSetUserStatus(openid, targetOpenId, status) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  if (!["active", "mute", "banned"].includes(status)) return fail("状态非法");
  const user = await getUserByOpenId(targetOpenId);
  if (!user) return fail("用户不存在");
  await db.collection(COLLECTIONS.users).doc(user._id).update({
    data: { status, updatedAt: new Date() }
  });
  return ok({}, "用户状态更新成功");
}

async function adminListSensitiveWords(openid) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const res = await db.collection("sensitive_words").orderBy("createdAt", "desc").limit(200).get();
  return ok({
    list: res.data.map((it) => ({
      id: it._id,
      word: it.word,
      enabled: !!it.enabled,
      createdAt: it.createdAt
    }))
  });
}

async function adminAddSensitiveWord(openid, word) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const value = normalizeText(word);
  if (!value) return fail("关键词不能为空");
  const exists = await db.collection("sensitive_words").where({ word: value }).limit(1).get();
  if (exists.data.length) return fail("关键词已存在");
  await db.collection("sensitive_words").add({
    data: {
      word: value,
      enabled: true,
      createdAt: new Date(),
      createdBy: openid
    }
  });
  sensitiveWordsCache = { words: [], expireAt: 0 };
  return ok({}, "添加成功");
}

async function adminToggleSensitiveWord(openid, id, enabled) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  await db.collection("sensitive_words").doc(id).update({
    data: { enabled: !!enabled, updatedAt: new Date() }
  });
  sensitiveWordsCache = { words: [], expireAt: 0 };
  return ok({}, "更新成功");
}

async function adminListModerationTasks(openid, status = "pending") {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const where = status === "all" ? {} : { status };
  const tasks = await db
    .collection("moderation_tasks")
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return ok({
    list: tasks.data.map((t) => ({
      id: t._id,
      messageId: t.messageId,
      mediaUrl: t.mediaUrl,
      roomId: t.roomId,
      status: t.status,
      createdAt: t.createdAt
    }))
  });
}

async function adminHandleModerationTask(openid, taskId, decision) {
  const guard = await adminGuard(openid);
  if (!guard.success) return guard;
  const taskRes = await db.collection("moderation_tasks").doc(taskId).get();
  const task = taskRes.data;
  if (!task) return fail("审核任务不存在");
  if (task.status !== "pending") return fail("审核任务已处理");
  const status = decision === "approve" ? "approved" : "rejected";
  await db.collection("moderation_tasks").doc(taskId).update({
    data: {
      status,
      handledBy: openid,
      handledAt: new Date()
    }
  });
  await db.collection(COLLECTIONS.messages).doc(task.messageId).update({
    data: { reviewStatus: decision === "approve" ? "pass" : "rejected", updatedAt: new Date() }
  });
  return ok({}, "审核处理成功");
}

async function getMessages(openid, roomId) {
  const roomRes = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  const room = roomRes.data;
  if (!room) return fail("会话不存在");
  if (room.user1OpenId !== openid && room.user2OpenId !== openid) return fail("无权限");

  const messages = await db
    .collection(COLLECTIONS.messages)
    .where({ roomId })
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  return ok({
    list: messages.data.map((m) => ({
      id: m._id,
      text: m.content,
      msgType: m.msgType || "text",
      mediaUrl: m.mediaUrl || "",
      reviewStatus: m.reviewStatus || "pass",
      isSelf: m.fromOpenId === openid,
      createdAt: m.createdAt
    }))
  });
}

async function addFriend(openid, roomId) {
  return requestFriend(openid, roomId, "想继续聊聊吗？");
}

async function requestFriend(openid, roomId, note = "") {
  const userCheck = await checkUserStatus(openid);
  if (!userCheck.success) return userCheck;

  const roomRes = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  const room = roomRes.data;
  if (!room) return fail("会话不存在");
  if (room.user1OpenId !== openid && room.user2OpenId !== openid) return fail("无权限");

  const peerOpenId = room.user1OpenId === openid ? room.user2OpenId : room.user1OpenId;
  const already = await db
    .collection(COLLECTIONS.friends)
    .where({ userOpenId: openid, friendOpenId: peerOpenId })
    .limit(1)
    .get();
  if (already.data.length) return ok({}, "你们已经是好友");

  const pending = await db
    .collection(COLLECTIONS.friendRequests)
    .where(
      _.and([
        _.or([
          { fromOpenId: openid, toOpenId: peerOpenId },
          { fromOpenId: peerOpenId, toOpenId: openid }
        ]),
        { status: "pending" }
      ])
    )
    .limit(1)
    .get();
  if (pending.data.length) return ok({ requestId: pending.data[0]._id }, "好友请求已存在");

  const now = new Date();
  const created = await db.collection(COLLECTIONS.friendRequests).add({
    data: {
      fromOpenId: openid,
      toOpenId: peerOpenId,
      note: normalizeText(note).slice(0, 40),
      sourceRoomId: roomId,
      status: "pending",
      createdAt: now
    }
  });
  return ok({ requestId: created._id }, "好友申请已发送");
}

async function respondFriendRequest(openid, requestId, decision) {
  const req = await db.collection(COLLECTIONS.friendRequests).doc(requestId).get();
  const row = req.data;
  if (!row) return fail("好友申请不存在");
  if (row.toOpenId !== openid) return fail("无权限处理");
  if (row.status !== "pending") return fail("申请已处理");

  const now = new Date();
  if (decision !== "accept" && decision !== "reject") return fail("参数错误");
  if (decision === "reject") {
    await db.collection(COLLECTIONS.friendRequests).doc(requestId).update({
      data: { status: "rejected", handledAt: now }
    });
    return ok({}, "已拒绝");
  }

  const already = await db
    .collection(COLLECTIONS.friends)
    .where({ userOpenId: openid, friendOpenId: row.fromOpenId })
    .limit(1)
    .get();
  if (!already.data.length) {
    await db.collection(COLLECTIONS.friends).add({
      data: {
        userOpenId: row.fromOpenId,
        friendOpenId: row.toOpenId,
        sourceRoomId: row.sourceRoomId,
        createdAt: now
      }
    });
    await db.collection(COLLECTIONS.friends).add({
      data: {
        userOpenId: row.toOpenId,
        friendOpenId: row.fromOpenId,
        sourceRoomId: row.sourceRoomId,
        createdAt: now
      }
    });
  }
  await db.collection(COLLECTIONS.friendRequests).doc(requestId).update({
    data: { status: "accepted", handledAt: now }
  });
  if (row.sourceRoomId) {
    await db.collection(COLLECTIONS.rooms).doc(row.sourceRoomId).update({
      data: { status: "friend", updatedAt: now }
    });
  }
  return ok({}, "已同意好友申请");
}

async function listFriendRequests(openid, type = "inbox") {
  const where = type === "outbox" ? { fromOpenId: openid } : { toOpenId: openid };
  const requests = await db
    .collection(COLLECTIONS.friendRequests)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  const list = [];
  for (const req of requests.data) {
    const peerOpenId = type === "outbox" ? req.toOpenId : req.fromOpenId;
    const peer = await getUserByOpenId(peerOpenId);
    list.push({
      id: req._id,
      peerOpenId,
      peerName: peer?.nickName || "微信用户",
      peerAvatar: peer?.avatarUrl || "",
      note: req.note || "",
      status: req.status,
      createdAt: req.createdAt
    });
  }
  return ok({ list });
}

async function listFriends(openid) {
  const rows = await db
    .collection(COLLECTIONS.friends)
    .where({ userOpenId: openid })
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  const list = [];
  for (const row of rows.data) {
    const user = await getUserByOpenId(row.friendOpenId);
    list.push({
      id: row._id,
      friendOpenId: row.friendOpenId,
      nickName: user?.nickName || "微信用户",
      avatarUrl: user?.avatarUrl || "",
      createdAt: row.createdAt
    });
  }
  return ok({ list });
}

async function closeRoom(openid, roomId) {
  const roomRes = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  const room = roomRes.data;
  if (!room) return fail("会话不存在");
  if (room.user1OpenId !== openid && room.user2OpenId !== openid) return fail("无权限");
  await db.collection(COLLECTIONS.rooms).doc(roomId).update({
    data: { status: "closed", closedAt: new Date() }
  });
  return ok({}, "会话已结束");
}

async function listMatchHistory(openid) {
  const rooms = await db
    .collection(COLLECTIONS.rooms)
    .where(_.or([{ user1OpenId: openid }, { user2OpenId: openid }]))
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  const list = [];
  for (const room of rooms.data) {
    const peerOpenId = room.user1OpenId === openid ? room.user2OpenId : room.user1OpenId;
    const peer = await getUserByOpenId(peerOpenId);
    list.push({
      id: room._id,
      name: peer?.nickName || "微信用户",
      avatar: peer?.avatarUrl || "",
      status: room.status,
      statusText: room.status === "friend" ? "已添加好友" : "已匹配",
      time: room.createdAt
    });
  }
  return ok({ list });
}

async function blockUser(openid, targetOpenId, reason = "用户操作") {
  if (!targetOpenId) return fail("目标用户不能为空");
  if (targetOpenId === openid) return fail("不能拉黑自己");
  const exists = await db
    .collection(COLLECTIONS.blocks)
    .where({ userOpenId: openid, targetOpenId })
    .limit(1)
    .get();
  if (!exists.data.length) {
    await db.collection(COLLECTIONS.blocks).add({
      data: { userOpenId: openid, targetOpenId, reason, createdAt: new Date() }
    });
  }
  return ok({}, "已拉黑");
}

async function reportUser(openid, roomId, reason, detail = "") {
  const roomRes = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  const room = roomRes.data;
  if (!room) return fail("会话不存在");
  const targetOpenId = room.user1OpenId === openid ? room.user2OpenId : room.user1OpenId;
  await db.collection(COLLECTIONS.reports).add({
    data: {
      reporterOpenId: openid,
      targetOpenId,
      roomId,
      reason: reason || "其他",
      detail: normalizeText(detail).slice(0, 200),
      status: "pending",
      flowStatus: "pending_review",
      createdAt: new Date()
    }
  });
  return ok({}, "举报已提交");
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, payload = {} } = event || {};

  try {
    switch (action) {
      case "ensureUser":
        return ok(
          { user: await ensureUser(openid, payload.userInfo || {}) },
          "用户已就绪"
        );
      case "joinMatch":
        return joinMatch(openid, payload.preferences || {});
      case "getRoom":
        return getRoom(openid, payload.roomId);
      case "sendMessage":
        return sendMessage(openid, payload.roomId, payload.content);
      case "sendRichMessage":
        return sendRichMessage(openid, payload.roomId, payload.msgType, payload);
      case "getMessages":
        return getMessages(openid, payload.roomId);
      case "addFriend":
        return addFriend(openid, payload.roomId);
      case "requestFriend":
        return requestFriend(openid, payload.roomId, payload.note || "");
      case "respondFriendRequest":
        return respondFriendRequest(openid, payload.requestId, payload.decision);
      case "listFriendRequests":
        return listFriendRequests(openid, payload.type || "inbox");
      case "listFriends":
        return listFriends(openid);
      case "listMatchHistory":
        return listMatchHistory(openid);
      case "blockUser":
        return blockUser(openid, payload.targetOpenId, payload.reason);
      case "reportUser":
        return reportUser(openid, payload.roomId, payload.reason, payload.detail);
      case "closeRoom":
        return closeRoom(openid, payload.roomId);
      case "getPublicConfig":
        return getPublicConfig();
      case "adminGetOverview":
        return adminGetOverview(openid);
      case "adminListReports":
        return adminListReports(openid, payload.status || "pending");
      case "adminHandleReport":
        return adminHandleReport(openid, payload.reportId, payload.decision, payload.remark || "", payload.action || "none");
      case "adminSetUserStatus":
        return adminSetUserStatus(openid, payload.targetOpenId, payload.status);
      case "adminListSensitiveWords":
        return adminListSensitiveWords(openid);
      case "adminAddSensitiveWord":
        return adminAddSensitiveWord(openid, payload.word || "");
      case "adminToggleSensitiveWord":
        return adminToggleSensitiveWord(openid, payload.id, payload.enabled);
      case "adminGetTrends":
        return adminGetTrends(openid, payload.days || 7);
      case "adminListModerationTasks":
        return adminListModerationTasks(openid, payload.status || "pending");
      case "adminHandleModerationTask":
        return adminHandleModerationTask(openid, payload.taskId, payload.decision);
      default:
        return fail("不支持的 action");
    }
  } catch (error) {
    console.error("socialApi error:", error);
    return fail("服务异常，请稍后重试");
  }
};
