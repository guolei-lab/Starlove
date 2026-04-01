// chat.js - 聊天页面 v3.0 带倒计时 + 聊天结束状态
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    friend: null,
    messages: [],
    inputValue: '',
    isLoading: true,
    userInfo: {},
    // 倒计时 180秒 = 3分钟
    countdown: 180,
    // 聊天是否已结束
    isChatEnded: false,
    // 推荐话题
    recommendTopics: [
      '哈喽~ 你好呀',
      '很高兴认识你',
      '有空一起出来玩吗'
    ]
  },

  onLoad(options) {
    const friend = JSON.parse(decodeURIComponent(options.friend))
    // 检查是否携带过期标记
    const isChatEnded = options.isChatEnded === '1'
    let countdown = 180
    if (isChatEnded) {
      countdown = 0
    }
    this.setData({
      friend: friend,
      isChatEnded: isChatEnded,
      countdown: countdown,
      userInfo: app.globalData.userInfo
    })

    this.loadMessages()
    if (!isChatEnded) {
      this.startCountdown()
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({
      countdown: 180
    })

    const timer = setInterval(() => {
      let countdown = this.data.countdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({ 
          countdown: 0,
          isChatEnded: true
        })
        wx.showModal({
          title: '聊天倒计时结束',
          content: '聊得开心就添加好友继续聊吧',
          showCancel: false
        })
        return
      }
      this.setData({ countdown })
    }, 1000)
  },

  // 加载消息
  loadMessages() {
    this.setData({ isLoading: true })
    const friendOpenid = this.data.friend._openid

    util.callCloudFunction('getMessages', {
      withOpenid: friendOpenid
    }).then(res => {
      if (res.success && res.data) {
        // 标记是否自己发的
        const processed = res.data.map(msg => {
          return {
            ...msg,
            isSelf: msg.fromOpenid === app.globalData.userInfo._openid || msg.fromOpenid === app.globalData.userInfo.openid
          }
        })
        this.setData({
          messages: processed
        })
      }
      this.setData({ isLoading: false })
    }).catch(err => {
      console.error('加载消息失败', err)
      util.showError('加载消息失败，请稍后重试')
      this.setData({ isLoading: false })
    })
  },

  // 输入变化
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 快速选择推荐话题
  selectTopic(e) {
    const topic = this.data.recommendTopics[e.currentTarget.dataset.index]
    this.setData({
      inputValue: topic
    })
    this.sendMessage()
  },

  // 发送消息
  sendMessage() {
    // 聊天已结束不允许发送
    if (this.data.isChatEnded) {
      util.showError('聊天已结束，无法发送消息')
      return
    }

    const content = this.data.inputValue.trim()
    if (!content) {
      util.showError('请输入消息内容')
      return
    }

    const friend = this.data.friend
    util.showLoading('发送中...')

    util.callCloudFunction('sendMessage', {
      toOpenid: friend._openid,
      content: content,
      type: 'text'
    }).then(res => {
      util.hideLoading()
      if (res.success) {
        this.setData({
          inputValue: ''
        })
        // 重新加载消息
        this.loadMessages()
      } else {
        util.showError(res.message || '发送失败，请稍后重试')
      }
    }).catch(err => {
      util.hideLoading()
      console.error('发送失败', err)
      util.showError('发送失败，请稍后重试')
    })
  },

  onShow() {
    // 刷新消息
    if (this.data.friend) {
      this.loadMessages()
    }
  },

  // 添加好友
  addFriend() {
    const friend = this.data.friend
    // 这里根据你的业务逻辑处理
    // 比如打开客服会话，或者复制微信号，或者申请添加好友
    wx.showModal({
      title: '添加好友',
      content: `申请添加 ${friend.nickName} 为好友`,
      success: (res) => {
        if (res.confirm) {
          // 调用添加好友云函数
          util.callCloudFunction('requestAddFriend', {
            toOpenid: friend._openid
          }).then(res => {
            if (res.success) {
              util.showSuccess('申请已发送')
            } else {
              util.showError(res.message || '申请失败')
            }
          }).catch(err => {
            console.error('申请添加好友失败', err)
            util.showError('申请失败，请稍后重试')
          })
        }
      }
    })
  }
})
