// StarLove - 发送消息云函数 v2.0
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const fromOpenid = wxContext.OPENID
  const { toOpenid, content } = event
  
  try {
    // 简单内容安全检查（空内容检查）
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        message: '消息内容不能为空',
        data: null
      }
    }

    if (content.length > 500) {
      return {
        success: false,
        message: '消息内容太长，请控制在500字以内',
        data: null
      }
    }
    
    // 保存消息到数据库
    await db.collection('messages').add({
      data: {
        from_openid: fromOpenid,
        to_openid: toOpenid,
        content: content.trim(),
        create_time: new Date(),
        is_read: false
      }
    })
    
    return {
      success: true,
      message: '发送成功',
      data: null
    }
    
  } catch (error) {
    console.error('发送消息失败:', error)
    return {
      success: false,
      message: '发送失败',
      error: error.message
    }
  }
}
