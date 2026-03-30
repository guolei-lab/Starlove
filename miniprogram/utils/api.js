function callApi(action, payload = {}) {
  return wx.cloud.callFunction({
    name: "socialApi",
    data: { action, payload }
  }).then((res) => {
    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.message || "请求失败");
    }
    return result.data || {};
  });
}

module.exports = {
  callApi
};
