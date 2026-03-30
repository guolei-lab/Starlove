const app = getApp()
const { callApi } = require("../../utils/api")
const { shouldShowPlacement, markPlacementShown } = require("../../utils/ad")

Page({
  data: {
    matchedUser: {},
    roomId: "",
    messages: [],
    inputText: '',
    countdown: 180,
    chatEnded: false,
    scrollToId: '',
    timer: null,
    poller: null,
    watcher: null,
    realtimeConnected: false,
    friendRequestSent: false,
    adSlots: {},
    showEndBannerAd: false
  },

  onLoad(options) {
    const roomId = options.roomId || ""
    if (!roomId) {
      wx.showToast({ title: "会话参数错误", icon: "none" })
      wx.switchTab({ url: "/pages/index/index" })
      return
    }
    const ad = app.globalData.ad || {}
    const showEndBannerAd = !!ad.enableBanner && shouldShowPlacement("chatEndBanner", ad.minIntervalSec || 90)
    if (showEndBannerAd) {
      markPlacementShown("chatEndBanner")
    }
    this.setData({
      adSlots: ad.placements || {},
      showEndBannerAd
    })
    this.setData({ roomId })
    this.loadRoom()
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    if (this.data.poller) {
      clearInterval(this.data.poller)
    }
    if (this.data.watcher && this.data.watcher.close) {
      this.data.watcher.close()
    }
  },

  loadRoom() {
    callApi("getRoom", { roomId: this.data.roomId }).then((data) => {
      const now = Date.now()
      const expireAt = new Date(data.expireAt).getTime()
      const sec = Math.max(Math.floor((expireAt - now) / 1000), 0)
      this.setData({
        matchedUser: {
          openid: data.matchedUser.openid,
          avatarUrl: data.matchedUser.avatarUrl || "/images/avatar.png",
          nickName: data.matchedUser.nickName || "微信用户"
        },
        countdown: sec,
        friendRequestSent: data.hasPendingRequest || false
      })
      if (sec <= 0) {
        this.setData({ chatEnded: true })
      } else {
        this.startCountdown()
      }
      this.refreshMessages()
      this.startRealtimeOrFallback()
    }).catch((err) => {
      wx.showToast({ title: err.message || "会话加载失败", icon: "none" })
    })
  },

  startRealtimeOrFallback() {
    try {
      const db = wx.cloud.database()
      const watcher = db.collection("messages").where({
        roomId: this.data.roomId
      }).watch({
        onChange: () => {
          this.setData({ realtimeConnected: true })
          this.refreshMessages()
        },
        onError: () => {
          this.setData({ realtimeConnected: false })
          this.startPolling()
        }
      })
      this.setData({ watcher })
    } catch (e) {
      this.setData({ realtimeConnected: false })
      this.startPolling()
    }
  },

  startPolling() {
    if (this.data.poller) return
    const poller = setInterval(() => this.refreshMessages(), 3000)
    this.setData({ poller })
  },

  refreshMessages() {
    callApi("getMessages", { roomId: this.data.roomId }).then((data) => {
      const list = (data.list || []).map((item) => ({
        id: item.id,
        text: item.text,
        msgType: item.msgType || "text",
        mediaUrl: item.mediaUrl || "",
        reviewStatus: item.reviewStatus || "pass",
        time: this.formatTime(item.createdAt),
        isSelf: item.isSelf,
        avatar: item.isSelf
          ? ((app.globalData.userInfo && app.globalData.userInfo.avatarUrl) || "/images/avatar.png")
          : (this.data.matchedUser.avatarUrl || "/images/avatar.png")
      }))
      this.setData({
        messages: list,
        scrollToId: `message-${Math.max(list.length - 1, 0)}`
      })
    })
  },

  startCountdown() {
    const timer = setInterval(() => {
      let countdown = this.data.countdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        if (this.data.poller) clearInterval(this.data.poller)
        this.setData({
          chatEnded: true,
          countdown: 0
        })
      } else {
        this.setData({
          countdown: countdown
        })
      }
    }, 1000)

    this.setData({
      timer: timer
    })
  },

  onInput(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  sendMessage() {
    if (this.data.chatEnded) return
    const text = this.data.inputText.trim()
    if (!text) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    callApi("sendRichMessage", {
      roomId: this.data.roomId,
      msgType: "text",
      content: text
    }).then(() => {
      this.setData({ inputText: "" })
      this.refreshMessages()
    }).catch((err) => {
      wx.showToast({
        title: err.message || "发送失败",
        icon: "none"
      })
    })
  },

  sendImage() {
    if (this.data.chatEnded) return
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = (res.tempFiles || [])[0]
        if (!file || !file.tempFilePath) return
        const cloudPath = `chat-images/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`
        wx.showLoading({ title: "上传中..." })
        wx.cloud.uploadFile({
          cloudPath,
          filePath: file.tempFilePath
        }).then((uploadRes) => {
          return callApi("sendRichMessage", {
            roomId: this.data.roomId,
            msgType: "image",
            mediaUrl: uploadRes.fileID
          })
        }).then(() => {
          wx.hideLoading()
          this.refreshMessages()
        }).catch((err) => {
          wx.hideLoading()
          wx.showToast({ title: err.message || "发送图片失败", icon: "none" })
        })
      }
    })
  },

  addFriend() {
    wx.showModal({
      title: '发送好友申请',
      content: '确定要向对方发送好友申请吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '发送中...'
          })
          callApi("requestFriend", { roomId: this.data.roomId, note: "聊得很开心，交个朋友吧" }).then(() => {
            wx.hideLoading()
            this.setData({ friendRequestSent: true })
            wx.showToast({
              title: '申请已发送',
              icon: 'success'
            })
          }).catch((err) => {
            wx.hideLoading()
            wx.showToast({
              title: err.message || "添加失败",
              icon: "none"
            })
          })
        }
      }
    })
  },

  reportUser() {
    wx.showModal({
      title: "举报用户",
      editable: true,
      placeholderText: "请输入举报原因",
      success: (res) => {
        if (!res.confirm) return
        callApi("reportUser", {
          roomId: this.data.roomId,
          reason: "用户举报",
          detail: res.content || "无详情"
        }).then(() => {
          wx.showToast({ title: "举报成功", icon: "success" })
        }).catch((err) => {
          wx.showToast({ title: err.message || "举报失败", icon: "none" })
        })
      }
    })
  },

  blockUser() {
    wx.showModal({
      title: "拉黑用户",
      content: "拉黑后将无法继续聊天，是否确认？",
      success: (res) => {
        if (!res.confirm) return
        callApi("blockUser", {
          targetOpenId: this.data.matchedUser.openid,
          reason: "聊天中拉黑"
        }).then(() => {
          wx.showToast({ title: "已拉黑", icon: "success" })
          this.closeRoomAndBack()
        }).catch((err) => {
          wx.showToast({ title: err.message || "操作失败", icon: "none" })
        })
      }
    })
  },

  closeRoomAndBack() {
    callApi("closeRoom", { roomId: this.data.roomId }).finally(() => {
      wx.switchTab({ url: "/pages/index/index" })
    })
  },

  goBack() {
    this.closeRoomAndBack()
  },

  formatTime(value) {
    const now = new Date(value)
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }
})
