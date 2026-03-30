// StarLove - 获取用户统计数据云函数 v2.0 新增
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取总匹配次数
    const matchesResult = await db.collection('matches')
      .where({
        $or: [
          { user1_openid: openid },
          { user2_openid: openid }
        ]
      })
      .count()
    
    const totalMatches = matchesResult.total
    
    // 获取好友数量
    const friendsResult = await db.collection('friends')
      .where({
        user_openid: openid,
        status: 'accepted'
      })
      .count()
    
    const friendsCount = friendsResult.total
    
    return {
      success: true,
      message: '获取成功',
      data: {
        totalMatches,
        friendsCount
      }
    }
    
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return {
      success: false,
      message: '获取统计数据失败',
      error: error.message,
      data: null
    }
  }
}
