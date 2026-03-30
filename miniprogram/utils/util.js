/**
 * StarLove 通用工具函数
 * v2.0 优化提取
 */

// 格式化时间
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

// 格式化日期为友好显示
const formatDate = dateStr => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const day = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (day === 0) {
    return '今天'
  } else if (day === 1) {
    return '昨天'
  } else if (day < 7) {
    return `${day}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout
  return function () {
    const context = this
    const args = arguments
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

// 节流函数
function throttle(func, limit) {
  let inThrottle
  return function () {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 显示加载提示
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载提示
function hideLoading() {
  wx.hideLoading()
}

// 显示成功提示
function showSuccess(title, duration = 1500) {
  wx.showToast({
    title,
    icon: 'success',
    duration
  })
}

// 显示错误提示
function showError(title, duration = 2000) {
  wx.showToast({
    title,
    icon: 'none',
    duration
  })
}

// 显示模态框，返回Promise
function showModal(title, content, confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: res => {
        if (res.confirm) {
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: reject
    })
  })
}

// 云函数调用封装，返回Promise
function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.result && typeof res.result.success === 'boolean') {
          if (res.result.success) {
            resolve(res.result)
          } else {
            reject(res.result)
          }
        } else {
          resolve(res.result)
        }
      },
      fail: err => {
        console.error(`云函数 ${name} 调用失败:`, err)
        reject(err)
      }
    })
  })
}

// 检查网络状态
function checkNetwork() {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: res => {
        if (res.networkType === 'none') {
          showError('网络连接失败，请检查网络设置')
          resolve(false)
        } else {
          resolve(true)
        }
      },
      fail: reject
    })
  })
}

// 图片预览
function previewImage(current, urls) {
  wx.previewImage({
    current,
    urls
  })
}

// 验证输入内容，过滤敏感内容
function validateInput(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, message: '内容不能为空' }
  }
  
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return { valid: false, message: '内容不能为空' }
  }
  
  if (trimmed.length > 500) {
    return { valid: false, message: '内容太长啦，请控制在500字以内' }
  }
  
  // 简单的敏感内容过滤，可以根据实际需求扩展
  // 建议结合微信内容安全API进行检测
  const sensitiveWords = [] // 在这里添加敏感词列表
  for (const word of sensitiveWords) {
    if (trimmed.toLowerCase().includes(word.toLowerCase())) {
      return { valid: false, message: '内容包含不当内容，请修改后重试' }
    }
  }
  
  return { valid: true, message: '', content: trimmed }
}

// 生成随机ID
function generateId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

module.exports = {
  formatTime,
  formatNumber,
  formatDate,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showModal,
  callCloudFunction,
  checkNetwork,
  previewImage,
  validateInput,
  generateId
}
