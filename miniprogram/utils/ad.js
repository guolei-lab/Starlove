const STORAGE_KEY = "soft_ad_last_show_map";

function getMap() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function setMap(map) {
  try {
    wx.setStorageSync(STORAGE_KEY, map);
  } catch (e) {
    // ignore
  }
}

function shouldShowPlacement(placement, minIntervalSec) {
  const key = placement || "default";
  const map = getMap();
  const now = Date.now();
  const last = map[key] || 0;
  return now - last >= minIntervalSec * 1000;
}

function markPlacementShown(placement) {
  const key = placement || "default";
  const map = getMap();
  map[key] = Date.now();
  setMap(map);
}

module.exports = {
  shouldShowPlacement,
  markPlacementShown
};
