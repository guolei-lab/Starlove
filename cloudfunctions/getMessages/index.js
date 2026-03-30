// StarLove - 获取聊天消息云函数 v2.0 新增
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { friendOpenid } = event
  
  try {
    // 获取双方的聊天记录
    const result1 = await db.collection('messages')
      .where({
        from_openid: openid,
        to_openid: friendOpenid
      })
      .orderBy('create_time', 'asc')
      .get()
    
    const result2 = await db.collection('messages')
      .where({
        from_openid: friendOpenid,
        to_openid: openid
      })
      .orderBy('create_time', 'asc')
      .get()
    
    // 合并消息并排序
    let messages = [...result1.data, ...result2.data]
    messages.sort((a, b) => {
      return new Date(a.create_time) - new Date(b.create_time)
    })
    
    // 标记为自己发送的消息
    messages = messages.map(msg => {
      return {
        ...msg,
        id: msg._id,
        isSelf: msg.from_openid === openid
      }
    })
    
    // 标记对方消息为已读
    await db.collection('messages')
      .where({
        from_openid: friendOpenid,
        to_openid: openid,
        is_read: false
      })
      .update({
        data: {
          is_read: true
        }
      })
    
    return {
      success: true,
      message: '获取成功',
      data: {
        messages,
        count: messages.length
      }
    }
    
  } catch (error) {
    console.error('获取消息失败:', error)
    return {
      success: false,
      message: '获取消息失败',
      error: error.message,
      data: null
    }
  }
}
