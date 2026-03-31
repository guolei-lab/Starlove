// StarLove - 个人中心页面 v2.1
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: null,
    friends: [],
    recentMatches: [],
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
    this.loadRecentMatches()
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

  // 跳转到编辑资料页面
  goToEditProfile() {
    wx.navigateTo({
      url: '/pages/editprofile/editprofile'
    })
  },

  // 加载最近匹配历史
  loadRecentMatches() {
    util.callCloudFunction('socialApi', {
      action: 'listMatchHistory'
    }).then(res => {
      if (res.success && res.data && res.data.length > 0) {
        // 处理数据，标记是否已是好友
        const friendOpenids = this.data.friends.map(f => f._openid || f.friend_openid)
        const processed = res.data.map(match => {
          return {
            ...match,
            isFriend: friendOpenids.includes(match.toOpenid)
          }
        })
        this.setData({
          recentMatches: processed
        })
      }
    }).catch(err => {
      console.error('加载匹配历史失败', err)
    })
  },

  // 从匹配历史添加好友 - 需要看广告解锁
  addFriendFromMatch(e) {
    const match = e.currentTarget.dataset.match
    
    // 检查有没有匹配次数，没有就让看广告
    if (app.globalData.matchCount <= 0) {
      wx.showModal({
        title: '需要观看广告',
        content: '添加匹配过的用户需要消耗一次匹配次数，观看广告可以获得一次次数',
        confirmText: '观看广告',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            app.showAd()
            // 广告看完会自动增加次数，这里等一下再执行添加
            setTimeout(() => {
              if (app.globalData.matchCount > 0) {
                this.doAddFriend(match)
              }
            }, 1500)
          }
        }
      })
    } else {
      // 有次数直接添加
      this.doAddFriend(match)
    }
  },

  // 执行添加好友
  doAddFriend(match) {
    if (!app.useMatchCount()) {
      return
    }
    
    util.showLoading('添加中...')
    util.callCloudFunction('addFriend', {
      friendOpenid: match._openid
    }).then(res => {
      util.hideLoading()
      if (res.success) {
        util.showSuccess('添加好友成功')
        // 刷新列表
        this.loadFriends()
        this.loadRecentMatches()
      } else {
        util.showError(res.message || '添加失败')
        // 回滚次数
        app.globalData.matchCount += 1
      }
    }).catch(err => {
      util.hideLoading()
      util.showError('添加失败，请稍后重试')
      console.error('添加好友失败', err)
      app.globalData.matchCount += 1
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
    util.showModal('确认退出', '确定要退出登录吗？退出后需要重新授权登录')
      .then(confirm => {
        if (confirm) {
          // 清除所有缓存和全局数据
          app.globalData.userInfo = null
          try {
            wx.removeStorageSync('userInfo')
            wx.removeStorageSync('lastMatchDate')
          } catch (e) {
            console.error('清除缓存失败', e)
          }
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
      content: '遇见你，是最美的意外\n\n版本 v2.1.0',
      showCancel: false
    })
  }
})
