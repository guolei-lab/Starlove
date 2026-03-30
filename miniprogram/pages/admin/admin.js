const { callApi } = require("../../utils/api");
const { formatRelativeTime } = require("../../utils/util");

Page({
  data: {
    loading: false,
    overview: {
      pendingReports: 0,
      userCount: 0,
      roomCount: 0
    },
    trends: [],
    reports: [],
    moderationTasks: [],
    sensitiveWords: [],
    newWord: ""
  },

  onShow() {
    this.refreshAll();
  },

  refreshAll() {
    this.setData({ loading: true });
    Promise.all([
      callApi("adminGetOverview"),
      callApi("adminGetTrends", { days: 7 }),
      callApi("adminListReports", { status: "pending" }),
      callApi("adminListModerationTasks", { status: "pending" }),
      callApi("adminListSensitiveWords")
    ]).then(([overview, trends, reports, tasks, words]) => {
      this.setData({
        overview,
        trends: trends.points || [],
        reports: (reports.list || []).map((it) => ({
          ...it,
          displayTime: formatRelativeTime(new Date(it.createdAt).getTime())
        })),
        moderationTasks: (tasks.list || []).map((it) => ({
          ...it,
          displayTime: formatRelativeTime(new Date(it.createdAt).getTime())
        })),
        sensitiveWords: words.list || [],
        loading: false
      });
    }).catch((err) => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    });
  },

  handleModeration(e) {
    const { id, decision } = e.currentTarget.dataset;
    callApi("adminHandleModerationTask", {
      taskId: id,
      decision
    }).then(() => {
      wx.showToast({ title: "处理成功", icon: "success" });
      this.refreshAll();
    }).catch((err) => {
      wx.showToast({ title: err.message || "处理失败", icon: "none" });
    });
  },

  onWordInput(e) {
    this.setData({ newWord: e.detail.value });
  },

  addWord() {
    const word = (this.data.newWord || "").trim();
    if (!word) {
      wx.showToast({ title: "请输入关键词", icon: "none" });
      return;
    }
    callApi("adminAddSensitiveWord", { word }).then(() => {
      wx.showToast({ title: "添加成功", icon: "success" });
      this.setData({ newWord: "" });
      this.refreshAll();
    }).catch((err) => {
      wx.showToast({ title: err.message || "添加失败", icon: "none" });
    });
  },

  toggleWord(e) {
    const { id, enabled } = e.currentTarget.dataset;
    callApi("adminToggleSensitiveWord", { id, enabled: !enabled }).then(() => {
      this.refreshAll();
    });
  },

  handleReport(e) {
    const { id, decision } = e.currentTarget.dataset;
    if (decision === "resolve") {
      wx.showActionSheet({
        itemList: ["仅结案", "结案并禁言", "结案并封禁"],
        success: (sheet) => {
          const action = sheet.tapIndex === 2 ? "ban" : (sheet.tapIndex === 1 ? "mute" : "none");
          callApi("adminHandleReport", { reportId: id, decision, action }).then(() => {
            this.refreshAll();
          }).catch((err) => {
            wx.showToast({ title: err.message || "处理失败", icon: "none" });
          });
        }
      });
      return;
    }
    callApi("adminHandleReport", { reportId: id, decision, action: "none" }).then(() => {
      this.refreshAll();
    }).catch((err) => {
      wx.showToast({ title: err.message || "处理失败", icon: "none" });
    });
  }
});
