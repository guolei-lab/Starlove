const { callApi } = require("../../utils/api")
const { shouldShowPlacement, markPlacementShown } = require("../../utils/ad")
const app = getApp()

Page({
  data: {
    matchTips: [
      '正在为你寻找有缘人...',
      '检查缘分指数...',
      '匹配相似的兴趣爱好...'
    ],
    matched: false,
    matchedUser: null,
    matchFailed: false,
    roomId: "",
    expireAt: null,
    adSlots: {},
    showBannerAd: false
  },

  onLoad() {
    const ad = app.globalData.ad || {}
    const showBannerAd = !!ad.enableBanner && shouldShowPlacement("matchingBanner", ad.minIntervalSec || 90)
    if (showBannerAd) {
      markPlacementShown("matchingBanner")
    }
    this.setData({
      adSlots: ad.placements || {},
      showBannerAd
    })
    this.startMatching()
  },

  startMatching() {
    wx.showLoading({ title: "匹配中..." })
    callApi("joinMatch").then((data) => {
      this.setData({
        matched: true,
        matchedUser: {
          avatarUrl: data.matchedUser.avatarUrl || "/images/avatar.png",
          nickName: data.matchedUser.nickName || "微信用户",
          desc: (data.matchedUser.interests || []).join(" / ") || data.matchedUser.location || "聊聊你感兴趣的话题吧"
        },
        roomId: data.roomId,
        expireAt: data.expireAt
      })
      wx.hideLoading()
      wx.showToast({
        title: '匹配成功！',
        icon: 'success'
      })
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ matchFailed: true, matched: false })
      wx.showToast({ title: err.message || "匹配失败", icon: "none" })
    })
  },

  startChat() {
    if (!this.data.roomId) return
    wx.navigateTo({
      url: `/pages/chat/chat?roomId=${this.data.roomId}`
    })
  },

  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
