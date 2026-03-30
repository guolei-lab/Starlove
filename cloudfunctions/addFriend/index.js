// StarLove - 添加好友云函数 v2.0
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const fromOpenid = wxContext.OPENID
  const { friendOpenid } = event
  
  try {
    // 检查是否已经是好友
    const existingFriend = await db.collection('friends')
      .where({
        user_openid: fromOpenid,
        friend_openid: friendOpenid
      })
      .get()
    
    if (existingFriend.data.length > 0) {
      return {
        success: false,
        message: '你们已经是好友啦',
        data: null
      }
    }
    
    // 获取对方用户信息
    const friendInfo = await db.collection('users')
      .where({
        _openid: friendOpenid
      })
      .get()
    
    if (friendInfo.data.length === 0) {
      return {
        success: false,
        message: '找不到该用户信息',
        data: null
      }
    }
    
    const friendUserData = friendInfo.data[0]
    const friendNickName = friendUserData.nickName
    const friendAvatar = friendUserData.avatarUrl
    
    // 获取当前用户信息
    const currentUserInfo = await db.collection('users')
      .where({
        _openid: fromOpenid
      })
      .get()
    
    let currentNickName = ''
    let currentAvatar = ''
    if (currentUserInfo.data.length > 0) {
      currentNickName = currentUserInfo.data[0].nickName
      currentAvatar = currentUserInfo.data[0].avatarUrl
    }
    
    // 互加好友 - 当前用户添加对方
    await db.collection('friends').add({
      data: {
        user_openid: fromOpenid,
        friend_openid: friendOpenid,
        friend_name: friendNickName,
        friend_avatar: friendAvatar,
        create_time: new Date(),
        status: 'accepted'
      }
    })
    
    // 对方也添加当前用户
    await db.collection('friends').add({
      data: {
        user_openid: friendOpenid,
        friend_openid: fromOpenid,
        friend_name: currentNickName,
        friend_avatar: currentAvatar,
        create_time: new Date(),
        status: 'accepted'
      }
    })
    
    // 更新匹配状态为已加好友
    await db.collection('matches')
      .where({
        $or: [
          { user1_openid: fromOpenid, user2_openid: friendOpenid },
          { user1_openid: friendOpenid, user2_openid: fromOpenid }
        ]
      })
      .update({
        data: {
          status: 'friend',
          friend_time: new Date()
        }
      })
    
    return {
      success: true,
      message: '添加好友成功',
      data: {
        friendNickName,
        friendAvatar
      }
    }
    
  } catch (error) {
    console.error('添加好友失败:', error)
    return {
      success: false,
      message: '添加好友失败，请重试',
      error: error.message
    }
  }
}
