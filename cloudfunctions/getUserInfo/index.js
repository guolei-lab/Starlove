// 云函数：获取用户信息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    const result = await db.collection('users').where({
      _openid: OPENID
    }).get()
    
    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      }
    } else {
      return {
        success: false,
        message: '用户不存在',
        data: null
      }
    }
  } catch (err) {
    return {
      success: false,
      message: err.message,
      error: err
    }
  }
}
