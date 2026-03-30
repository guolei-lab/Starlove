// StarLove - 匹配用户云函数 v2.0
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const _ = db.command

/**
 * 匹配用户云函数
 * 根据用户信息匹配最适合的陌生人
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userInfo, location, interests } = event
  
  try {
    // 获取当前用户openid
    const openid = wxContext.OPENID
    
    // 保存或更新当前用户信息到数据库
    const existingUser = await db.collection('users').where({
      _openid: openid
    }).get()
    
    if (existingUser.data.length === 0) {
      // 新用户，创建记录
      await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender || 0,
          location: location || '',
          interests: interests || [],
          createTime: new Date(),
          updateTime: new Date()
        }
      })
    } else {
      // 更新用户信息
      await db.collection('users').where({
        _openid: openid
      }).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender || 0,
          updateTime: new Date()
        }
      })
    }
    
    // 从数据库中查找匹配的用户
    // 排除自己，查找未匹配过的用户
    let query = db.collection('users').where({
      _openid: _.neq(openid)
    })
    
    // 如果有兴趣标签，可以基于兴趣进行初步筛选（可选）
    // if (interests && interests.length > 0) {
    //   query = query.where({
    //     interests: _.elemMatch(_.in(interests))
    //   })
    // }
    
    const usersResult = await query.limit(20).get()
    
    // 如果没有找到用户，返回空
    if (usersResult.data.length === 0) {
      return {
        success: false,
        message: '暂时没有合适的匹配对象，请稍后再试',
        data: null
      }
    }
    
    // 随机选择一个用户
    const randomIndex = Math.floor(Math.random() * usersResult.data.length)
    const matchedUser = usersResult.data[randomIndex]
    
    // 记录匹配记录
    await db.collection('matches').add({
      data: {
        user1_openid: openid,
        user2_openid: matchedUser._openid,
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
      error: error.message,
      data: null
    }
  }
}
