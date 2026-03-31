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
    // 热门话题 - 年轻人关注的话题，分类涵盖恋爱/生活/职场/兴趣
    hotTopics: [
      { id: 1, title: '恋爱中你最在意什么？', count: 5281, category: '恋爱' },
      { id: 2, title: '第一次约会去哪里比较好', count: 4892, category: '恋爱' },
      { id: 3, title: '情侣间每天都聊什么？', count: 4126, category: '恋爱' },
      { id: 4, title: '你能接受姐弟恋吗？', count: 3875, category: '恋爱' },
      { id: 5, title: '月薪多少敢谈恋爱', count: 3654, category: '现实' },
      { id: 6, title: '周末和对象去哪约会', count: 3210, category: '生活' },
      { id: 7, title: '谈恋爱一定要同居吗', count: 2988, category: '恋爱' },
      { id: 8, title: '你有过网恋经历吗', count: 2756, category: '恋爱' },
      { id: 9, title: '工作重要还是对象重要', count: 2541, category: '现实' },
      { id: 10, title: '分享一下你的暗恋故事', count: 2315, category: '情感' }
    ],
    lastUpdateText: ''
  },

  onLoad() {
    // 检查用户是否已登录
    this.checkLoginStatus()
    // 更新话题热门度，模拟动态更新
    this.updateTopicCounts()
    this.updateLastUpdateText()
  },

  onShow() {
    // 页面显示时更新匹配次数
    this.setData({
      matchCount: app.globalData.matchCount,
      maxMatchCount: app.globalData.maxMatchCount
    })
  },

  // 检查登录状态 - 强制不自动登录，让用户手动点击授权按钮
  checkLoginStatus() {
    // 👉 启动时一定清空，保证不自动登录，必须用户手动点授权
    app.globalData.userInfo = null
    this.setData({
      isLogin: false,
      userInfo: null
    })
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
      
      // 自动生成二次元风格头像
      util.showLoading('生成专属头像中...')
      // 使用随机种子生成专属二次元头像，风格包含二次元/校园/情侣
      const seed = Math.random().toString(36).substring(2, 10)
      // 调用免费头像API生成
      const generatedAvatar = `https://api.oneway.love/avatar/?seed=${seed}&style=anime`
      
      // 用生成的二次元头像替换默认头像
      userInfo.avatarUrl = generatedAvatar

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
  }
})
