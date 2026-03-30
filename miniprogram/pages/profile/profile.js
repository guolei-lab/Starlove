const app = getApp()
const { callApi } = require("../../utils/api")
const { formatRelativeTime } = require("../../utils/util")
const { shouldShowPlacement, markPlacementShown } = require("../../utils/ad")

Page({
  data: {
    userInfo: {
      avatarUrl: '/images/avatar.png',
      nickName: '温暖用户'
    },
    userId: "",
    matchCount: 10,
    maxMatchCount: 20,
    matchHistory: [],
    friendRequests: [],
    friends: [],
    adSlots: {},
    showBannerAd: false,
    isAdmin: false
  },

  onLoad() {
    this.getUserInfo()
  },

  onShow() {
    const ad = app.globalData.ad || {}
    const showBannerAd = !!ad.enableBanner && shouldShowPlacement("profileBanner", ad.minIntervalSec || 90)
    if (showBannerAd) {
      markPlacementShown("profileBanner")
    }
    this.setData({
      matchCount: app.globalData.matchCount,
      maxMatchCount: app.globalData.maxMatchCount,
      adSlots: ad.placements || {},
      showBannerAd
    })
    this.loadMatchHistory()
    this.loadFriendRequests()
    this.loadFriends()
    this.checkAdmin()
  },

  checkAdmin() {
    callApi("adminGetOverview").then(() => {
      this.setData({ isAdmin: true })
    }).catch(() => {
      this.setData({ isAdmin: false })
    })
  },

  getUserInfo() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        userId: app.globalData.userInfo._id || app.globalData.userInfo.nickName || "用户"
      })
    }
  },

  loadMatchHistory() {
    callApi("listMatchHistory").then((data) => {
      const list = (data.list || []).map((item) => ({
        id: item.id,
        roomId: item.id,
        name: item.name,
        avatar: item.avatar || "/images/avatar.png",
        time: formatRelativeTime(new Date(item.time).getTime()),
        status: item.status,
        statusText: item.statusText
      }))
      this.setData({ matchHistory: list })
    })
  },

  loadFriendRequests() {
    callApi("listFriendRequests", { type: "inbox" }).then((data) => {
      const list = (data.list || []).map((item) => ({
        id: item.id,
        name: item.peerName,
        avatar: item.peerAvatar || "/images/avatar.png",
        status: item.status,
        time: formatRelativeTime(new Date(item.createdAt).getTime())
      }))
      this.setData({ friendRequests: list })
    })
  },

  loadFriends() {
    callApi("listFriends").then((data) => {
      const list = (data.list || []).map((item) => ({
        id: item.id,
        name: item.nickName,
        avatar: item.avatarUrl || "/images/avatar.png",
        time: formatRelativeTime(new Date(item.createdAt).getTime())
      }))
      this.setData({ friends: list })
    })
  },

  handleFriendRequest(e) {
    const id = e.currentTarget.dataset.id
    const decision = e.currentTarget.dataset.decision
    callApi("respondFriendRequest", { requestId: id, decision }).then(() => {
      wx.showToast({
        title: decision === "accept" ? "已同意" : "已拒绝",
        icon: "success"
      })
      this.loadFriendRequests()
      this.loadFriends()
      this.loadMatchHistory()
    }).catch((err) => {
      wx.showToast({ title: err.message || "操作失败", icon: "none" })
    })
  },

  viewChat(e) {
    const roomId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/chat/chat?roomId=${roomId}`
    })
  },

  goToEditProfile() {
    wx.showModal({
      title: '编辑个人资料',

      content: '该功能正在开发中，敬请期待～',

      showCancel: false

    })
  },

  goToPrivacy() {
    wx.showModal({
      title: '隐私设置',

      content: '该功能正在开发中，敬请期待～',

      showCancel: false

    })
  },

  goToFeedback() {
    wx.showModal({
      title: '意见反馈',

      content: '该功能正在开发中，敬请期待～',

      showCancel: false

    })
  },

  goToAbout() {
    wx.showModal({
      title: '关于我们',

      content: '温暖社交 - 遇见你，是最美的意外\n版本: 1.0.0\n开发者: 温暖团队',

      showCancel: false

    })
  },

  goToAdmin() {
    wx.navigateTo({
      url: "/pages/admin/admin"
    })
  },

  logout() {
    wx.showModal({
      title: '退出登录',

      content: '确定要退出登录吗？',

      success: res => {
        if (res.confirm) {
          app.globalData.userInfo = null
          wx.switchTab({
            url: '/pages/index/index'
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})
