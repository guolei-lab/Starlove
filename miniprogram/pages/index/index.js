// StarLove - 首页逻辑 v2.0
const app = getApp()
const util = require('../../utils/util.js')

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
    ]
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

  // 检查登录状态
  checkLoginStatus() {
    if (app.globalData.userInfo) {
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo
      })
      // 即使有缓存的userInfo，也要检查后端是否有用户资料
      this.checkUserInfoInDB()
    } else {
      // 尝试获取用户信息
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            wx.getUserInfo({
              success: res => {
                app.globalData.userInfo = res.userInfo
                this.setData({
                  isLogin: true,
                  userInfo: res.userInfo
                })
                this.checkUserInfoInDB()
              },
              fail: () => {
                this.setData({ isLogin: false })
              }
            })
          } else {
            // 明确未授权，显示登录按钮
            this.setData({ isLogin: false })
          }
        },
        fail: () => {
          this.setData({ isLogin: false })
        }
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
              url: '/pages/profile/profile'
            })
          }
        })
      }
    }).catch(err => {
      console.error('检查用户信息失败', err)
    })
  },

  // 用户授权登录
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      let userInfo = e.detail.userInfo
      
      // 自动生成二次元风格头像
      util.showLoading('生成专属头像中...')
      // 使用随机种子生成专属二次元头像，风格包含二次元/校园/情侣
      const seed = Math.random().toString(36).substring(2, 10)
      // 调用免费头像API生成
      const generatedAvatar = `https://api.oneway.love/avatar/?seed=${seed}&style=anime`
      
      // 用生成的二次元头像替换默认头像
      userInfo.avatarUrl = generatedAvatar
      
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
            content: '授权成功，已为你生成专属二次元头像，请完善你的个人资料，方便更好的匹配',
            showCancel: false,
            success: () => {
              wx.navigateTo({
                url: '/pages/profile/profile'
              })
            }
          })
        }
      }).catch(err => {
        console.error('检查用户信息失败', err)
      })
    } else {
      util.showError('需要授权才能使用StarLove')
      wx.showModal({
        title: '需要授权',
        content: 'StarLove需要获取你的微信昵称才能使用，请同意授权登录，我们会为你生成专属二次元风格头像',
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
  }
})
