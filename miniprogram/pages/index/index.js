const app = getApp()
const { shouldShowPlacement, markPlacementShown } = require("../../utils/ad")

Page({
  data: {
    isLogin: false,
    userInfo: null,
    matchCount: 10,
    maxMatchCount: 20,
    isMatching: false,
    hotTopics: [
      { id: 1, title: '你的理想型', count: 2345 },
      { id: 2, title: '周末去哪玩', count: 1892 },
      { id: 3, title: '职场新人', count: 1567 },
      { id: 4, title: '美食探店', count: 1234 }
    ],
    adSlots: {},
    showBannerAd: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    const ad = app.globalData.ad || {}
    const showBannerAd = !!ad.enableBanner && shouldShowPlacement("indexBanner", ad.minIntervalSec || 90)
    if (showBannerAd) {
      markPlacementShown("indexBanner")
    }
    this.setData({
      matchCount: app.globalData.matchCount,
      maxMatchCount: app.globalData.maxMatchCount,
      adSlots: ad.placements || {},
      showBannerAd
    })
  },

  checkLoginStatus() {
    if (app.globalData.userInfo) {
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo
      })
    }
  },

  onGetUserInfo(e) {
    const userInfo = e.detail.userInfo
    if (!userInfo) {
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none'
      })
      return
    }
    wx.showLoading({ title: "登录中..." })
    app.ensureLogin(userInfo).then((user) => {
      this.setData({
        isLogin: true,
        userInfo: user
      })
      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || "登录失败",
        icon: "none"
      })
    })
  },

  startMatch() {
    if (!this.data.isLogin) {
      wx.showToast({ title: "请先登录", icon: "none" })
      return
    }
    if (this.data.matchCount <= 0) {
      this.showAd()
      return
    }

    if (!app.useMatchCount()) {
      return
    }

    this.setData({
      isMatching: true,
      matchCount: app.globalData.matchCount
    })

    wx.navigateTo({
      url: '/pages/matching/matching'
    })
    this.setData({
      isMatching: false
    })
  },

  showAd() {
    app.showAd()
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  }
})
