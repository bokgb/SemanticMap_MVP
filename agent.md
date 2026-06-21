# Agent Notes

- 修改 UI 或影响页面视觉表现的代码后，请运行 `npm run preview:mobile`，并在回复里明确告诉用户 `screenshots/mobile-preview.html` 已更新。
- 做移动端弹窗、抽屉、面板时，标题、关闭按钮、tab、确认按钮等控制区不能放进滚动区；使用固定 header/footer + 单独滚动 body 的结构，并验证滚到最底后控制区仍可见。
