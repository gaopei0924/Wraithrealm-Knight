# 亡域騎士 Wraithrealm Knight

瀏覽器動作 Roguelike ARPG。Three.js 渲染 + Rapier 物理，類 Hades 俯視角、
房間制地城、波次刷怪、三段連擊、翻滾無敵幀、擊殺掉落強化。
支援桌機鍵鼠與手機觸控（虛擬搖桿 + 全螢幕橫向）。

## 快速開始

```bash
npm install
npm run dev
```

第一次執行 `npm run dev` 會自動下載 CC0 美術素材（約 25MB，來自 KayKit 官方
GitHub 鏡像）並量測 tile 尺寸，之後直接啟動。打開 http://localhost:5173 即可遊玩。

## 操作

| 按鍵 | 動作 |
|------|------|
| WASD / 方向鍵 | 移動 |
| J / 滑鼠左鍵 | 攻擊（連按出三段連擊，第三段範圍加大） |
| Space / 滑鼠右鍵 | 翻滾（帶無敵幀） |
| K | 旋風斬（360° AoE，耗 30 MP） |
| L | 盾擊（前方擊退，耗 25 MP） |
| Q | 喝治療藥水 |

右下角的按鈕也可以直接點。

### 手機操作

- 進入後點「▶ 進入地城」會自動請求全螢幕並鎖定橫向（iOS Safari 無法程式鎖定，
  會顯示提示請手動轉橫）。
- **左半邊螢幕**任意位置按住拖曳 = 浮動虛擬搖桿（類比方向，越偏移走越快）。
- **右下按鈕**：⚔ 攻擊（按住連打）、🌀 旋風斬、🛡 盾擊、💨 翻滾、🧪 藥水。
- 頂部 ⛶ 可隨時切換全螢幕。
- 已停用瀏覽器的雙指縮放、雙擊放大、下拉刷新、長按選單，避免誤觸打斷操作。

## 玩法

- 地城由 6 個房間以走廊串成（每場隨機生成）。
- 進入戰鬥房會落閘鎖門，清完所有波次才開門；清房回血 30% 並補一瓶藥水。
- 敵人：骷髏小兵 / 盜賊（快）/ 戰士（坦）/ 法師（遠程魔彈）。
- 擊殺掉落經驗珠，升級時三選一強化（傷害、吸血、暴擊、翻滾冷卻⋯）。
- 清完最終房間獲勝。

## 資產管線

美術素材不進版控，由腳本管理：

```bash
npm run assets:download   # 下載 KayKit CC0 GLB（冪等，已存在會跳過）
npm run assets:measure    # 解析 GLB 計算每塊 tile 的包圍盒 → tile-manifest.json
```

- `scripts/asset-manifest.mjs` — 素材清單（KayKit Dungeon Remastered +
  Adventurers + Skeletons 三包，全 CC0，授權檔一併下載）。
- `scripts/measure-tiles.mjs` — 直接解析 GLB 二進位的 glTF JSON chunk，
  走訪 node 階層算出世界空間 AABB。地城產生器用量出來的尺寸
  （grid = 4m）動態拼接，不寫死任何 tile 大小。

## 架構

```
src/
├── core/        # 渲染引擎（相機/燈光）、Rapier 物理、輸入、資產載入、合成音效
├── dungeon/     # layout.js 純資料房間圖生成；builder.js 拼 tile + 碰撞體 + 裝飾
├── entities/    # 角色動畫狀態機、玩家（連擊/翻滾/技能）、敵人 AI、波次導演
├── combat/      # 升級池
├── fx/          # 斬擊弧光、打擊火花、經驗珠、魔彈、火把燈光池
└── ui/          # HUD（血條/小地圖/傷害數字/升級卡/結算畫面）
```

技術細節：
- 走廊/房間用全域 floor-cell 集合推導牆面與門口，房間鎖門用動態 Rapier collider。
- 火把全場景只用 7 盞 point light 的固定池，每幀重新指派給離玩家最近的火把
  （forward renderer 不重編 shader）。
- 南側牆壓矮 30% 避免擋住相機（攝影機固定從南方俯視）。
- 角色動畫內嵌於 KayKit GLB（76+ 段），用 AnimationMixer crossfade。
