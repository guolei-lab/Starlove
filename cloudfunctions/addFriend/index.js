// 年轻人社交微信小程序 - 添加好友云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()

/**
 * 添加好友云函数
 * 处理用户之间的好友关系建立
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { toUser, matchId } = event
  
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
    
    // 验证用户权限
    if (match.data.user1_openid !== wxContext.OPENID && 
        match.data.user2_openid !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权限添加好友',
        data: null
      }
    }
    
    // 检查是否已经是好友
    const existingFriend = await db.collection('friends')
      .where({
        user_openid: wxContext.OPENID,
        friend_openid: toUser
      })
      .get()
    
    if (existingFriend.data.length > 0) {
      return {
        success: false,
        message: '已经是好友关系',
        data: null
      }
    }
    
    // 创建好友关系（双向）
    await db.collection('friends').add({
      data: {
        user_openid: wxContext.OPENID,
        friend_openid: toUser,
        add_time: new Date(),
        status: 'active'
      }
    })
    
    await db.collection('friends').add({
      data: {
        user_openid: toUser,
        friend_openid: wxContext.OPENID,
        add_time: new Date(),
        status: 'active'
      }
    })
    
    // 更新匹配状态为已添加好友
    await db.collection('matches')
      .doc(matchId)
      .update({
        data: {
          status: 'friend',
          friend_time: new Date()
        }
      })
    
    return {
      success: true,
      message: '好友添加成功',
      data: {
        addTime: new Date()
      }
    }
    
  } catch (error) {
    console.error('添加好友失败:', error)
    return {
      success: false,
      message: '好友添加失败，请稍后重试',
      data: null
    }
  }
}