// 年轻人社交微信小程序 - 匹配用户云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()

/**
 * 匹配用户云函数
 * 根据用户信息匹配最适合的陌生人
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userInfo, location, interests } = event
  
  try {
    // 获取当前用户信息
    const currentUser = {
      openid: wxContext.OPENID,
      ...userInfo
    }
    
    // 从数据库中查找匹配的用户
    // 这里使用简单的随机匹配算法，实际应用中可以根据更多因素进行匹配
    const users = await db.collection('users')
      .where({
        // 排除自己
        _openid: db.command.neq(wxContext.OPENID),
        // 可以根据兴趣、位置等条件筛选
        // interests: db.command.in(interests)
      })
      .limit(10)
      .get()
    
    // 如果没有找到用户，返回空
    if (users.data.length === 0) {
      return {
        success: false,
        message: '暂时没有合适的匹配对象',
        data: null
      }
    }
    
    // 随机选择一个用户
    const randomIndex = Math.floor(Math.random() * users.data.length)
    const matchedUser = users.data[randomIndex]
    
    // 记录匹配记录
    await db.collection('matches').add({
      data: {
        user1_openid: wxContext.OPENID,
        user2_openid: matchedUser._openid,
        user1_info: currentUser,
        user2_info: matchedUser,
        match_time: new Date(),
        status: 'matched'
      }
    })
    
    return {
      success: true,
      message: '匹配成功',
      data: {
        matchedUser: {
          openid: matchedUser._openid,
          nickName: matchedUser.nickName,
          avatarUrl: matchedUser.avatarUrl,
          interests: matchedUser.interests || [],
          location: matchedUser.location || ''
        }
      }
    }
    
  } catch (error) {
    console.error('匹配用户失败:', error)
    return {
      success: false,
      message: '匹配失败，请稍后重试',
      data: null
    }
  }
}