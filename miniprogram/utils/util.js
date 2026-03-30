// 年轻人社交微信小程序 - 工具函数
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 生成随机用户ID
const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9)
}

// 格式化时间（相对时间）
const formatRelativeTime = timestamp => {
  const now = new Date().getTime()
  const diff = now - timestamp
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`
  } else {
    return formatTime(new Date(timestamp))
  }
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 检查网络状态
const checkNetwork = () => {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: res => {
        if (res.networkType === 'none') {
          reject(new Error('网络连接失败'))
        } else {
          resolve(res.networkType)
        }
      },
      fail: reject
    })
  })
}

// 显示加载提示
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title: title,
    mask: true
  })
}

// 隐藏加载提示
const hideLoading = () => {
  wx.hideLoading()
}

// 显示成功提示
const showSuccess = (title, duration = 1500) => {
  wx.showToast({
    title: title,
    icon: 'success',
    duration: duration
  })
}

// 显示错误提示
const showError = (title, duration = 2000) => {
  wx.showToast({
    title: title,
    icon: 'none',
    duration: duration
  })
}

// 确认对话框
const confirm = (title, content) => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: title,
      content: content,
      success: res => {
        resolve(res.confirm)
      },
      fail: reject
    })
  })
}

// 本地存储
const storage = {
  set(key, value) {
    try {
      wx.setStorageSync(key, value)
    } catch (e) {
      console.error('存储失败:', e)
    }
  },
  
  get(key) {
    try {
      return wx.getStorageSync(key)
    } catch (e) {
      console.error('读取失败:', e)
      return null
    }
  },
  
  remove(key) {
    try {
      wx.removeStorageSync(key)
    } catch (e) {
      console.error('删除失败:', e)
    }
  },
  
  clear() {
    try {
      wx.clearStorageSync()
    } catch (e) {
      console.error('清空失败:', e)
    }
  }
}

// 导出所有工具函数
module.exports = {
  formatTime,
  formatNumber,
  generateUserId,
  formatRelativeTime,
  debounce,
  throttle,
  checkNetwork,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  confirm,
  storage
}
