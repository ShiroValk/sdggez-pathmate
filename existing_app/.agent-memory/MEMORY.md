# 工作区记忆

## MemoPath 引擎（memopath-engine.ts）写操作必须走 demoMode 分支

- 现象：演示模式下点「一键叫车」报 401「請先登入」，请求打到 `/api/memopath/trips/<demo-id>/call`
- 根因：演示模式无 token，但写操作直接调 `memoApi`，demo 行程 ID 不是真实后端数据
- 修复：所有写操作（callCab、saveGeofence 等）先 `if (state.demoMode)` 本地改 `state` + `rerenderIf` 后 return，非演示模式才调 `memoApi`；新增写操作时遵循同一模式
