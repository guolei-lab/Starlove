// StarLove - 获取好友列表云函数 v2.0 新增
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    const result = await db.collection('friends')
      .where({
        user_openid: openid,
        status: 'accepted'
      })
      .orderBy('create_time', 'desc')
      .get()
    
    // 格式化时间
    const friends = result.data.map(item => {
      return {
        ...item,
        create_time_fmt: formatDate(item.create_time)
      }
    })
    
    return {
      success: true,
      message: '获取成功',
      data: {
        friends,
        count: friends.length
      }
    }
    
  } catch (error) {
    console.error('获取好友列表失败:', error)
    return {
      success: false,
      message: '获取好友列表失败',
      error: error.message,
      data: null
    }
  }
}

// 格式化日期
function formatDate(dateObj) {
  if (!dateObj) return ''
  const date = new Date(dateObj)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}
