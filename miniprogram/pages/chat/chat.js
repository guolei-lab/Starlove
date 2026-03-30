// StarLove - 好友聊天页面 v2.0（新增）
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    friend: null,
    messages: [],
    inputValue: '',
    isLoading: false
  },

  onLoad(options) {
    if (options.friend) {
      try {
        const friend = JSON.parse(decodeURIComponent(options.friend))
        this.setData({
          friend
        })
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: friend.friend_name
        })
        // 加载消息记录
        this.loadMessages()
      } catch (err) {
        console.error('解析好友信息失败', err)
        util.showError('好友信息错误')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } else {
      util.showError('未找到好友信息')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载消息记录
  loadMessages() {
    this.setData({ isLoading: true })
    
    util.callCloudFunction('getMessages', {
      friendOpenid: this.data.friend.friend_openid
    })
      .then(res => {
        if (res.data && res.data.messages) {
          // 标记消息为已读
          this.setData({
            messages: res.data.messages
          })
          // 滚动到底部
          this.scrollToBottom()
        }
      })
      .catch(err => {
        console.error('加载消息失败', err)
        util.showError(err.message || '加载消息失败')
      })
      .finally(() => {
        this.setData({ isLoading: false })
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
      create_time: new Date().toISOString()
    }

    const messages = [...this.data.messages, message]
    this.setData({
      messages,
      inputValue: ''
    })

    // 滚动到底部
    this.scrollToBottom()

    // 调用云函数发送消息
    util.callCloudFunction('sendMessage', {
      toOpenid: this.data.friend.friend_openid,
      content: validation.content
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

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 99999,
        duration: 300
      })
    }, 100)
  }
})
