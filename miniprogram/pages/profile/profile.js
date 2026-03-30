// StarLove - 个人中心页面 v2.0
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: null,
    friends: [],
    matchCount: 0,
    totalMatches: 0,
    friendsCount: 0,
    isLoading: false
  },

  onLoad() {
    this.setData({
      userInfo: app.globalData.userInfo,
      matchCount: app.globalData.matchCount
    })
  },

  onShow() {
    this.loadFriends()
    this.loadStatistics()
  },

  // 加载好友列表
  loadFriends() {
    this.setData({ isLoading: true })
    
    util.callCloudFunction('getFriends')
      .then(res => {
        if (res.data && res.data.friends) {
          this.setData({
            friends: res.data.friends
          })
        }
      })
      .catch(err => {
        console.error('加载好友列表失败', err)
        util.showError(err.message || '加载好友列表失败')
      })
      .finally(() => {
        this.setData({ isLoading: false })
      })
  },

  // 加载统计数据
  loadStatistics() {
    util.callCloudFunction('getUserStatistics')
      .then(res => {
        if (res.data) {
          this.setData({
            totalMatches: res.data.totalMatches || 0,
            friendsCount: res.data.friendsCount || 0
          })
        }
      })
      .catch(err => {
        console.error('加载统计数据失败', err)
      })
  },

  // 跳转到聊天页面
  goToChat(e) {
    const friend = e.currentTarget.dataset.friend
    wx.navigateTo({
      url: `/pages/chat/chat?friend=${encodeURIComponent(JSON.stringify(friend))}`
    })
  },

  // 退出登录
  logout() {
    util.showModal('确认退出', '确定要退出登录吗？')
      .then(confirm => {
        if (confirm) {
          app.globalData.userInfo = null
          wx.reLaunch({
            url: '/pages/index/index'
          })
          util.showSuccess('已退出登录')
        }
      })
  },

  // 关于我们
  about() {
    wx.showModal({
      title: 'StarLove',
      content: '遇见你，是最美的意外\n\n版本 v2.0.0',
      showCancel: false
    })
  }
})
