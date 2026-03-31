// StarLove - 年轻人温暖社交微信小程序
// v2.0.0 优化升级版本
App({
  onLaunch() {
    // 初始化云开发
    this.initCloud()
    
    // 检查用户是否授权
    this.checkUserAuth()

    // 初始化广告
    this.initAd()
    
    // 重置每日匹配次数（缓存记录日期）
    this.resetDailyMatchCount()
  },

  onShow() {
    // 应用启动或切前台时检查网络状态
    this.checkNetwork()
    // 检查是否需要重置每日次数
    this.resetDailyMatchCount()
  },

  globalData: {
    userInfo: null,
    matchCount: 10, // 每日匹配次数
    maxMatchCount: 20, // 每日最大匹配次数
    adLoaded: false, // 广告是否加载完成
    adUnitId: 'adunit-your_ad_unit_id', // 广告位ID，需要替换为实际的
    envId: 'cloudbase-3gv0z379e74c9733', // 云开发环境ID
    currentMatch: null // 当前正在聊天的匹配对象
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showToast({
        title: '微信版本过低，请升级',
        icon: 'none',
        duration: 3000
      })
    } else {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      })
      console.log('云开发初始化完成，环境ID:', this.globalData.envId)
    }
  },

  // 检查用户授权
  checkUserAuth() {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已授权，获取用户信息
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo
              console.log('用户信息获取成功')
            },
            fail: err => {
              console.error('获取用户信息失败', err)
            }
          })
        }
      },
      fail: err => {
        console.error('获取授权信息失败', err)
      }
    })
  },

  // 重置每日匹配次数
  resetDailyMatchCount() {
    try {
      const lastDate = wx.getStorageSync('lastMatchDate')
      const today = new Date().toDateString()
      
      if (lastDate !== today) {
        // 新的一天，重置次数
        this.globalData.matchCount = 10
        wx.setStorageSync('lastMatchDate', today)
        console.log('新的一天，匹配次数已重置为 10')
      }
    } catch (e) {
      console.error('重置匹配次数失败', e)
    }
  },

  // 初始化广告
  initAd() {
    if (wx.createRewardedVideoAd) {
      this.rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: this.globalData.adUnitId
      })
      
      this.rewardedVideoAd.onLoad(() => {
        console.log('广告加载成功')
        this.globalData.adLoaded = true
      })
      
      this.rewardedVideoAd.onError(err => {
        console.error('广告加载失败', err)
        this.globalData.adLoaded = false
      })
      
      this.rewardedVideoAd.onClose(res => {
        if (res && res.isEnded) {
          // 用户完整观看了广告，增加匹配次数
          this.addMatchCount()
        } else {
          wx.showToast({
            title: '未完整观看，无法获得次数',
            icon: 'none'
          })
        }
        // 预加载下一个广告
        setTimeout(() => {
          if (this.rewardedVideoAd) {
            this.rewardedVideoAd.load().catch(() => {
              console.log('预加载广告失败')
            })
          }
        }, 1000)
      })
    }
  },

  // 检查网络状态
  checkNetwork() {
    wx.getNetworkType({
      success: res => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接失败，请检查网络设置',
            icon: 'none',
            duration: 3000
          })
        }
      }
    })
  },

  // 增加匹配次数
  addMatchCount() {
    if (this.globalData.matchCount < this.globalData.maxMatchCount) {
      this.globalData.matchCount += 1
      wx.showToast({
        title: '匹配次数+1',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '今日匹配次数已达上限',
        icon: 'none'
      })
    }
  },

  // 消耗匹配次数
  useMatchCount() {
    if (this.globalData.matchCount > 0) {
      this.globalData.matchCount -= 1
      return true
    } else {
      wx.showModal({
        title: '匹配次数用完',
        content: `今日免费匹配次数已用完，观看广告可增加匹配次数（最多${this.globalData.maxMatchCount}次）`,
        confirmText: '观看广告',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            this.showAd()
          }
        }
      })
      return false
    }
  },

  // 显示广告
  showAd() {
    if (!this.rewardedVideoAd) {
      wx.showToast({
        title: '广告功能未开启',
        icon: 'none'
      })
      return
    }
    
    this.rewardedVideoAd.show().catch(() => {
      // 广告拉取失败，重新加载
      this.rewardedVideoAd.load().then(() => {
        this.rewardedVideoAd.show()
      }).catch(err => {
        console.error('广告显示失败', err)
        wx.showToast({
          title: '广告加载失败，请稍后重试',
          icon: 'none'
        })
      })
    })
  }
})
