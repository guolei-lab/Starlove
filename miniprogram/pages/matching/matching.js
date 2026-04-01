// StarLove - 匹配排队页面 v4.0 按照设计图重新设计
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: {},
    // Tips文案根据不同情况变化
    tipsText: 'tips: 聊天全程匿名，不用担心身份曝光~',
    mainTitle: '正在匹配...',
    // 排队位置 0表示马上匹配成功，>0显示排队位置
    queuePosition: 198,
    // 是否显示加速弹窗
    showAccelerateModal: false,
    // 默认选中年龄
    selectedAgeText: '24-30岁',
    // 默认选中地区
    selectedLocation: ''
  },

  onLoad(options) {
    // 获取当前用户信息
    this.setData({
      userInfo: app.globalData.userInfo
    })

    // 模拟排队过程，实际由云函数返回排队位置
    this.simulateMatching()
  },

  // 模拟匹配排队
  simulateMatching() {
    // 这里应该从云函数获取实时排队位置，现在模拟随机排队
    const queuePosition = Math.floor(Math.random() * 200) + 1
    this.setData({
      queuePosition: queuePosition
    })

    // 根据排队位置修改提示
    if (queuePosition > 10) {
      this.setData({
        tipsText: 'tips: 当前在线人数较少，若加速失败，将退回加速卡'
      })
    } else if (queuePosition > 0) {
      this.setData({
        tipsText: 'tips: 聊天全程匿名，不用担心身份曝光~'
      })
    } else {
      this.setData({
        tipsText: 'tips: 如果喜欢对方，可在聊天结束后申请添加对方为好友哦💖',
        mainTitle: '恭喜你🎉加速成功！',
      })
      // 倒计时跳转到聊天页
      setTimeout(() => {
        this.goToChat()
      }, 15000)
    }
  },

  // 显示加速弹窗
  showAccelerateModal() {
    this.setData({
      showAccelerateModal: true
    })
  },

  // 隐藏加速弹窗
  hideAccelerateModal() {
    this.setData({
      showAccelerateModal: false
    })
  },

  // 阻止冒泡
  stopPropagation() {
    // 什么都不做，阻止遮罩层关闭
  },

  // 执行加速
  doAccelerate() {
    this.hideAccelerateModal()
    util.showLoading('加速中...')
    // 调用云函数加速，这里模拟扣除钻石后加速
    setTimeout(() => {
      util.hideLoading()
      this.setData({
        queuePosition: 1,
        tipsText: '恭喜你🎊加速成功！当前位于第 1 位，预计15秒内进入对话...'
      })
      // 倒计时跳转聊天
      setTimeout(() => {
        this.goToChat()
      }, 15000)
    }, 1000)
  },

  // 选择地区
  selectLocation() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 使用位置卡
  useLocationCard() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 选择年龄
  selectAge() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 使用年龄卡
  useAgeCard() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 前往Plus页面
  goPlus() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    })
  },

  // 跳转到聊天页面
  goToChat() {
    // 这里跳转到已经做好的聊天页
    util.callCloudFunction('getMatchedUser', {}).then(res => {
      if (res.success && res.data) {
        wx.redirectTo({
          url: `/pages/chat/chat?friend=${encodeURIComponent(JSON.stringify(res.data))}&isChatEnded=0`
        })
      } else {
        util.showError('匹配失败，请重试')
        wx.navigateBack()
      }
    }).catch(err => {
      console.error('匹配失败', err)
      util.showError('匹配失败，请重试')
    })
  }
})
