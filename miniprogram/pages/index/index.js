// StarLove - 首页逻辑 v4.0 按照设计图重新设计 - 三分钟假装情侣
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    isLogin: false,
    userInfo: null,
    matchCount: 10,
    maxMatchCount: 20,
    isMatching: false,
    // 加速匹配开关
    accelerateMatch: false,
    // 功能卡片数据
    pendingMatchCount: 10
  },

  onLoad() {
    // 检查用户是否已登录
    this.checkLoginStatus()
  },

  onShow() {
    // 页面显示时更新匹配次数
    this.setData({
      matchCount: app.globalData.matchCount,
      maxMatchCount: app.globalData.maxMatchCount
    })
  },

  // 检查登录状态 - 正确逻辑：已登录保持，未登录显示登录按钮
  checkLoginStatus() {
    if (app.globalData.userInfo && app.globalData.userInfo.avatarUrl) {
      // ✅ 用户已经登录并且有头像，直接保持登录
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo
      })
      // 检查后端是否已有资料，没有会引导完善
      this.checkUserInfoInDB()
    } else {
      // ❌ 没有登录信息，显示登录按钮
      this.setData({
        isLogin: false,
        userInfo: null
      })
    }
  },

  // 检查数据库中是否有用户资料
  checkUserInfoInDB() {
    util.callCloudFunction('socialApi', {
      action: 'getCurrentUserInfo'
    }).then(res => {
      if (!res.success || !res.data) {
        // 用户没完善资料，引导去完善
        wx.showModal({
          title: '完善个人资料',
          content: '你的账号还未完善个人资料，请前往完善资料才能开始匹配',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/editprofile/editprofile'
            })
          }
        })
      } else {
        // 已经有资料，同步头像到全局（保证头像生成功能生效）
        if (res.data.avatarUrl && app.globalData.userInfo) {
          app.globalData.userInfo.avatarUrl = res.data.avatarUrl
          this.setData({
            'userInfo.avatarUrl': res.data.avatarUrl
          })
        }
      }
    }).catch(err => {
      console.error('检查用户信息失败', err)
    })
  },

  // 用户授权登录
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      let userInfo = e.detail.userInfo
      
      util.showLoading('登录中...')
      // 直接使用微信头像，不生成随机头像
      // 如果昵称是默认的"微信用户"，也清空让用户自己填
      if (!userInfo.nickName || userInfo.nickName === '微信用户') {
        userInfo.nickName = ''
      }
      
      app.globalData.userInfo = userInfo
      this.setData({
        isLogin: true,
        userInfo: userInfo
      })
      util.hideLoading()
      util.showSuccess('登录成功')

      // 检查是否已经完善个人信息，如果没有跳转到资料页
      util.callCloudFunction('socialApi', {
        action: 'getCurrentUserInfo'
      }).then(res => {
        if (!res.success || !res.data) {
          // 用户还没完善信息，跳转到个人资料页
          wx.showModal({
            title: '完善资料',
            content: '授权成功，请完善你的昵称和个人资料，方便更好的匹配',
            showCancel: false,
            success: () => {
              wx.navigateTo({
                url: '/pages/editprofile/editprofile'
              })
            }
          })
        }
      }).catch(err => {
        console.error('检查用户信息失败', err)
      })
    } else {
      util.showError('需要授权才能使用星愿')
      wx.showModal({
        title: '需要授权',
        content: '星愿需要获取你的基本信息才能使用，请同意授权登录',
        showCancel: false,
        confirmText: '我知道了'
      })
    }
  },

  // 开始匹配
  startMatch() {
    if (!util.checkNetwork()) {
      return
    }

    if (this.data.matchCount <= 0) {
      // 匹配次数用完，引导看广告
      app.showAd()
      return
    }

    // 消耗匹配次数
    if (!app.useMatchCount()) {
      return
    }

    this.setData({
      isMatching: true,
      matchCount: app.globalData.matchCount
    })

    util.showLoading('匹配中...')

    // 调用云函数进行匹配
    util.callCloudFunction('matchUser', {
      userInfo: app.globalData.userInfo,
      interests: []
    })
      .then(res => {
        util.hideLoading()
        this.setData({ isMatching: false })
        
        // 匹配成功，跳转到匹配页面
        wx.navigateTo({
          url: `/pages/matching/matching?matchedUser=${encodeURIComponent(JSON.stringify(res.data.matchedUser))}`
        })
      })
      .catch(err => {
        util.hideLoading()
        this.setData({ isMatching: false })
        
        console.error('匹配失败', err)
        util.showError(err.message || '匹配失败，请稍后重试')
        
        // 回滚匹配次数
        app.globalData.matchCount += 1
        this.setData({
          matchCount: app.globalData.matchCount
        })
      })
  },

  // 显示广告
  showAd() {
    app.showAd()
  },

  // 跳转到个人中心
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 动态更新话题热度，模拟自动更新
  updateTopicCounts() {
    const { hotTopics } = this.data
    // 给每个话题增加一点随机热度，模拟动态更新
    const updated = hotTopics.map(topic => {
      const randomAdd = Math.floor(Math.random() * 50)
      return {
        ...topic,
        count: topic.count + randomAdd
      }
    })
    // 按热度排序
    updated.sort((a, b) => b.count - a.count)
    this.setData({
      hotTopics: updated
    })
  },

  // 更新最后更新时间文字
  updateLastUpdateText() {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    this.setData({
      lastUpdateText: `${hour}:${minute < 10 ? '0' + minute : minute} 更新`
    })
  },

  // 加速匹配开关变化
  onAccelerateChange(e) {
    this.setData({
      accelerateMatch: e.detail.value
    })
  },

  // 语音匹配
  goVoiceMatch() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 速配好友
  goFastMatch() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 切换底部tab
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
    // 根据tab跳转
    const pages = ['/pages/profile/profile', '/pages/index/index', '', '']
    if (pages[tab]) {
      wx.switchTab({
        url: pages[tab]
      })
    }
  }
})
