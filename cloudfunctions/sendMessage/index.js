// 年轻人社交微信小程序 - 发送消息云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()

/**
 * 发送消息云函数
 * 处理用户之间的消息发送
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { toUser, message, matchId } = event
  
  try {
    // 验证匹配关系
    const match = await db.collection('matches')
      .doc(matchId)
      .get()
    
    if (!match.data) {
      return {
        success: false,
        message: '匹配记录不存在',
        data: null
      }
    }
    
    // 验证发送者权限
    if (match.data.user1_openid !== wxContext.OPENID && 
        match.data.user2_openid !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权限发送消息',
        data: null
      }
    }
    
    // 验证聊天时间（3分钟限制）
    const matchTime = new Date(match.data.match_time)
    const now = new Date()
    const diff = now - matchTime
    const threeMinutes = 3 * 60 * 1000
    
    if (diff > threeMinutes) {
      return {
        success: false,
        message: '聊天时间已结束',
        data: null
      }
    }
    
    // 保存消息到数据库
    const messageRecord = await db.collection('messages').add({
      data: {
        match_id: matchId,
        from_openid: wxContext.OPENID,
        to_openid: toUser,
        content: message,
        send_time: new Date(),
        read: false
      }
    })
    
    // 发送模板消息通知（可选）
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: toUser,
        templateId: 'your_template_id', // 需要配置实际的模板ID
        page: '/pages/chat/chat?matchId=' + matchId,
        data: {
          thing1: {
            value: '新消息提醒'
          },
          thing2: {
            value: message.substring(0, 20) + '...'
          },
          time3: {
            value: new Date().toLocaleString()
          }
        }
      })
    } catch (templateError) {
      console.warn('发送模板消息失败:', templateError)
    }
    
    return {
      success: true,
      message: '消息发送成功',
      data: {
        messageId: messageRecord._id,
        sendTime: new Date()
      }
    }
    
  } catch (error) {
    console.error('发送消息失败:', error)
    return {
      success: false,
      message: '消息发送失败，请稍后重试',
      data: null
    }
  }
}