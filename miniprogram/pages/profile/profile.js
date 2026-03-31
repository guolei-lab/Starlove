// StarLove - 个人中心页面 v2.1
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: null,
    friends: [],
    matchCount: 0,
    totalMatches: 0,
    friendsCount: 0,
    isLoading: false,
    // 表单相关
    genderOptions: ['男', '女', '保密'],
    genderIndex: 0,
    age: '',
    bio: '',
    saving: false
  },

  onLoad() {
    this.setData({
      userInfo: app.globalData.userInfo,
      matchCount: app.globalData.matchCount
    })

    // 尝试加载已有的用户信息
    this.loadUserInfo()
  },

  onShow() {
    this.loadFriends()
    this.loadStatistics()
  },

  // 加载已有用户信息
  loadUserInfo() {
    util.callCloudFunction('socialApi', {
      action: 'getCurrentUserInfo'
    }).then(res => {
      if (res.success && res.data) {
        const { gender, age, bio } = res.data
        this.setData({
          genderIndex: gender === '女' ? 1 : gender === '保密' ? 2 : 0,
          age: age ? String(age) : '',
          bio: bio || ''
        })
      }
    }).catch(err => {
      console.error('加载用户信息失败', err)
    })
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      genderIndex: e.detail.value
    })
  },

  // 年龄输入
  onAgeInput(e) {
    this.setData({
      age: e.detail.value
    })
  },

  // 简介输入
  onBioInput(e) {
    this.setData({
      bio: e.detail.value
    })
  },

  // 保存个人资料
  saveProfile() {
    const { genderIndex, age, bio } = this.data
    const userInfo = app.globalData.userInfo

    if (!age) {
      util.showError('请输入年龄')
      return
    }

    if (age < 18 || age > 80) {
      util.showError('请输入有效年龄')
      return
    }

    this.setData({ saving: true })

    util.callCloudFunction('socialApi', {
      action: 'updateUserInfo',
      payload: {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl, // 这里保存我们生成的头像URL
        gender: this.data.genderOptions[genderIndex],
        age: parseInt(age),
        bio: bio
      }
    }).then(res => {
      if (res.success) {
        util.showSuccess('资料保存成功')
        // 更新全局信息
        app.globalData.userInfo = {
          ...userInfo,
          gender: this.data.genderOptions[genderIndex],
          age: parseInt(age),
          bio: bio
        }
        this.setData({
          saving: false
        })
      } else {
        util.showError(res.message || '保存失败')
        this.setData({ saving: false })
      }
    }).catch(err => {
      console.error('保存失败', err)
      util.showError('保存失败，请稍后重试')
      this.setData({ saving: false })
    })
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
