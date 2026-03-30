const { callApi } = require("./utils/api");

App({
  onLaunch() {
    if (!wx.cloud) {
      wx.showToast({ title: "请升级基础库后使用", icon: "none" });
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId || wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    });
    this.syncPublicConfig();
    this.initAd();
    this.checkNetwork();
  },

  globalData: {
    userInfo: null,
    cloudEnvId: "",
    matchCount: 10,
    maxMatchCount: 20,
    adLoaded: false,
    adUnitId: "adunit-your_ad_unit_id",
    ad: {
      enableBanner: true,
      enableVideoReward: true,
      minIntervalSec: 90,
      placements: {
        indexBanner: "adunit-index-banner",
        matchingBanner: "adunit-matching-banner",
        chatEndBanner: "adunit-chat-end-banner",
        profileBanner: "adunit-profile-banner",
        feedBanner: "adunit-feed-banner"
      }
    }
  },

  // 初始化广告
  initAd() {
    if (!this.globalData.ad.enableVideoReward) return;
    if (wx.createRewardedVideoAd) {
      this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: this.globalData.adUnitId });
      this.rewardedVideoAd.onLoad(() => {
        this.globalData.adLoaded = true;
      });
      this.rewardedVideoAd.onError(err => {
        console.error("广告加载失败", err);
        this.globalData.adLoaded = false;
      });
      this.rewardedVideoAd.onClose(res => {
        if (res && res.isEnded) {
          this.addMatchCount();
        }
      });
    }
  },

  // 检查网络状态
  checkNetwork() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 增加匹配次数
  addMatchCount() {
    if (this.globalData.matchCount < this.globalData.maxMatchCount) {
      this.globalData.matchCount += 1
      wx.showToast({ title: "匹配次数+1", icon: "success" });
    } else {
      wx.showToast({ title: "今日匹配次数已达上限", icon: "none" });
    }
  },

  // 消耗匹配次数
  useMatchCount() {
    if (this.globalData.matchCount > 0) {
      this.globalData.matchCount -= 1;
      return true;
    } else {
      wx.showModal({
        title: "匹配次数用完",
        content: "今日免费匹配次数已用完，观看广告可增加匹配次数",
        confirmText: "观看广告",
        success: res => {
          if (res.confirm) {
            this.showAd();
          }
        }
      });
      return false;
    }
  },

  // 显示广告
  showAd() {
    if (this.rewardedVideoAd) {
      this.rewardedVideoAd.show().catch(() => {
        this.rewardedVideoAd.load().then(() => {
          this.rewardedVideoAd.show();
        }).catch(err => {
          console.error("广告显示失败", err);
          wx.showToast({
            title: "广告加载失败",
            icon: 'none'
          });
        });
      });
    } else {
      wx.showToast({
        title: "广告功能未开启",
        icon: 'none'
      });
    }
  },

  ensureLogin(userInfo) {
    return callApi("ensureUser", { userInfo }).then((data) => {
      this.globalData.userInfo = data.user || userInfo;
      return data.user;
    });
  },

  syncPublicConfig() {
    return callApi("getPublicConfig").then((data) => {
      if (data.config && data.config.ad) {
        this.globalData.ad = { ...this.globalData.ad, ...data.config.ad };
      }
    }).catch(() => {
      // use local defaults
    });
  }
});
