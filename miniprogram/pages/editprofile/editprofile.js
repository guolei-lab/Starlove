// editprofile.js - 编辑个人资料
const app = getApp()
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: null,
    genderOptions: ['男', '女', '保密'],
    genderIndex: 0,
    age: '',
    region: ['', '', ''],
    bio: '',
    saving: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo: userInfo
    })

    // 加载已有资料
    this.loadExistingInfo()
  },

  // 加载已有的用户信息
  loadExistingInfo() {
    util.callCloudFunction('socialApi', {
      action: 'getCurrentUserInfo'
    }).then(res => {
      if (res.success && res.data) {
        const { gender, age, bio, province, city } = res.data
        this.setData({
          genderIndex: gender === '女' ? 1 : gender === '保密' ? 2 : 0,
          age: age ? String(age) : '',
          region: province && city ? [province, city, ''] : ['', '', ''],
          bio: bio || ''
        })
        if (res.data.avatarUrl) {
          this.setData({
            'userInfo.avatarUrl': res.data.avatarUrl
          })
        }
      }
    }).catch(err => {
      console.error('加载资料失败', err)
    })
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      genderIndex: e.detail.value
    })
  },

  // 年龄输入
  onAgeInput(e) {
    this.setData({
      age: e.detail.value
    })
  },

  // 地区选择
  onRegionChange(e) {
    this.setData({
      region: e.detail.value
    })
  },

  // 简介输入
  onBioInput(e) {
    this.setData({
      bio: e.detail.value
    })
  },

  // 保存资料
  saveProfile() {
    const { genderIndex, age, region, bio } = this.data
    const userInfo = app.globalData.userInfo

    if (!age) {
      util.showError('请输入年龄')
      return
    }

    if (parseInt(age) < 18 || parseInt(age) > 80) {
      util.showError('请输入有效年龄')
      return
    }

    this.setData({ saving: true })

    util.callCloudFunction('socialApi', {
      action: 'updateUserInfo',
      payload: {
        nickName: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl, // 我们生成的头像
        gender: this.data.genderOptions[genderIndex],
        age: parseInt(age),
        province: region[0] || '',
        city: region[1] || '',
        bio: bio.trim()
      }
    }).then(res => {
      if (res.success) {
        util.showSuccess('资料保存成功')
        // 更新全局信息
        app.globalData.userInfo = {
          ...userInfo,
          gender: this.data.genderOptions[genderIndex],
          age: parseInt(age),
          province: region[0],
          city: region[1],
          bio: bio.trim()
        }
        this.setData({
          saving: false
        })
        // 返回个人中心
        wx.navigateBack()
      } else {
        util.showError(res.message || '保存失败')
        this.setData({
          saving: false
        })
      }
    }).catch(err => {
      console.error('保存失败', err)
      util.showError('保存失败，请稍后重试')
      this.setData({
        saving: false
      })
    })
  }
})
