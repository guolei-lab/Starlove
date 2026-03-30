// StarLove - 匹配聊天页面 v2.0
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    matchedUser: null,
    isLoading: true,
    chatTimeLeft: 180, // 3分钟，单位秒
    timer: null,
    isChatEnded: false,
    messages: [],
    inputValue: ''
  },

  onLoad(options) {
    if (options.matchedUser) {
      try {
        const matchedUser = JSON.parse(decodeURIComponent(options.matchedUser))
        this.setData({
          matchedUser,
          isLoading: false
        })
        // 开始倒计时
        this.startCountdown()
        // 保存当前匹配信息到全局
        app.globalData.currentMatch = matchedUser
      } catch (err) {
        console.error('解析匹配用户信息失败', err)
        util.showError('匹配信息错误')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } else {
      util.showError('未找到匹配用户')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onUnload() {
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
  },

  // 开始倒计时
  startCountdown() {
    const timer = setInterval(() => {
      const timeLeft = this.data.chatTimeLeft - 1
      this.setData({
        chatTimeLeft: timeLeft
      })
      if (timeLeft <= 0) {
        clearInterval(timer)
        this.chatEnded()
      }
    }, 1000)
    this.setData({ timer })
  },

  // 聊天时间结束
  chatEnded() {
    this.setData({
      isChatEnded: true
    })
    util.showModal('聊天时间到', '聊得开心吗？如果觉得投缘，可以添加对方为好友哦')
      .then(confirm => {
        if (confirm) {
          this.addFriend()
        } else {
          wx.navigateBack()
        }
      })
  },

  // 发送消息
  sendMessage() {
    const validation = util.validateInput(this.data.inputValue)
    if (!validation.valid) {
      util.showError(validation.message)
      return
    }

    const message = {
      id: Date.now(),
      content: validation.content,
      isSelf: true,
      time: new Date().toLocaleTimeString()
    }

    const messages = [...this.data.messages, message]
    this.setData({
      messages,
      inputValue: ''
    })

    // 调用云函数发送消息
    util.callCloudFunction('sendMessage', {
      toOpenid: this.data.matchedUser.openid,
      content: validation.content,
      isEnded: this.data.isChatEnded
    })
      .catch(err => {
        console.error('发送消息失败', err)
        util.showError(err.message || '发送失败，请重试')
        // 移除发送失败的消息
        this.setData({
          messages: this.data.messages.filter(m => m.id !== message.id)
        })
      })
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 添加好友
  addFriend() {
    util.showLoading('请求中...')

    util.callCloudFunction('addFriend', {
      friendOpenid: this.data.matchedUser.openid
    })
      .then(res => {
        util.hideLoading()
        util.showSuccess('添加成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
      .catch(err => {
        util.hideLoading()
        console.error('添加好友失败', err)
        util.showError(err.message || '添加失败，请重试')
      })
  },

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
})
