<template>
  <div class="action-panel">
    <h3 class="panel-title">行动</h3>
    <div v-if="comboCount > 0" class="combo-indicator">
      <div class="combo-header">
        <span class="combo-badge">⚡ 连击 ×{{ comboCount }}</span>
        <div class="combo-dots">
          <span
            v-for="i in 5"
            :key="i"
            class="combo-dot"
            :class="{ active: i <= comboCount }"
          ></span>
        </div>
      </div>
      <div v-if="comboTip" class="combo-tip">
        <span class="combo-tip-icon">{{ comboTip.recipeIcon }}</span>
        <span class="combo-tip-text">
          {{ comboTip.recipeName }}：下一步 → <strong>{{ comboTip.nextAction }}</strong>
        </span>
        <div class="combo-progress">
          <div
            class="combo-progress-bar"
            :style="{ width: (comboTip.progress / comboTip.total * 100) + '%' }"
          ></div>
        </div>
      </div>
    </div>
    <div v-if="lastCombo" class="combo-flash">
      <span class="combo-flash-icon">{{ lastCombo.icon }}</span>
      <span class="combo-flash-text">{{ lastCombo.name }} 触发！</span>
    </div>
    <div v-if="isNight" class="night-warning">
      <span>🌙 夜晚无法外出活动，请保持温暖！</span>
    </div>
    <div class="actions-grid">
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver }"
        @click="$emit('chop')"
      >
        <span class="btn-icon">🪓</span>
        <span class="btn-text">砍柴</span>
        <span class="btn-cost">-5 体温</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver }"
        @click="$emit('hunt')"
      >
        <span class="btn-icon">🏹</span>
        <span class="btn-text">狩猎</span>
        <span class="btn-cost">-8 体温</span>
        <span class="btn-hint">成功率: {{ Math.round(huntRate * 100) }}%</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver || !canCraft }"
        @click="$emit('craft')"
      >
        <span class="btn-icon">🔨</span>
        <span class="btn-text">制作工具</span>
        <span class="btn-cost">-6 体温</span>
        <span class="btn-hint">需要: 2🪵 + 1🦊</span>
      </button>
      <button 
        class="action-btn fire-btn" 
        :class="{ disabled: !canFire || gameOver }"
        @click="$emit('fire')"
      >
        <span class="btn-icon">🔥</span>
        <span class="btn-text">生火</span>
        <span class="btn-cost">-3 木头</span>
        <span class="btn-hint">+25~45 热量</span>
      </button>
      <button 
        class="action-btn food-btn" 
        :class="{ disabled: food <= 0 || gameOver }"
        @click="$emit('eat')"
      >
        <span class="btn-icon">🍖</span>
        <span class="btn-text">进食</span>
        <span class="btn-cost">-1 食物</span>
        <span class="btn-hint">+5~15 体温</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isNight: { type: Boolean, default: false },
  gameOver: { type: Boolean, default: false },
  canFire: { type: Boolean, default: false },
  canCraft: { type: Boolean, default: false },
  huntRate: { type: Number, default: 0.3 },
  food: { type: Number, default: 0 },
  comboCount: { type: Number, default: 0 },
  comboTip: { type: Object, default: null },
  lastCombo: { type: Object, default: null }
})

defineEmits(['chop', 'hunt', 'craft', 'fire', 'eat'])
</script>

<style scoped>
.action-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.combo-indicator {
  background: linear-gradient(135deg, rgba(255, 200, 50, 0.2), rgba(255, 150, 0, 0.1));
  border: 1px solid rgba(255, 200, 50, 0.5);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  animation: comboGlow 1.5s ease-in-out infinite;
}

@keyframes comboGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 200, 50, 0.2); }
  50% { box-shadow: 0 0 15px rgba(255, 200, 50, 0.4); }
}

.combo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.combo-badge {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}

.combo-dots {
  display: flex;
  gap: 4px;
}

.combo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.combo-dot.active {
  background: #ffd700;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
}

.combo-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.combo-tip-icon {
  font-size: 14px;
}

.combo-tip-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
}

.combo-tip-text strong {
  color: #ffd700;
}

.combo-progress {
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.combo-progress-bar {
  height: 100%;
  background: linear-gradient(to right, #ffd700, #ff8c00);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.combo-flash {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 140, 0, 0.3));
  border: 2px solid rgba(255, 215, 0, 0.8);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 12px;
  text-align: center;
  animation: flashIn 0.5s ease;
}

@keyframes flashIn {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.combo-flash-icon {
  font-size: 24px;
  margin-right: 6px;
}

.combo-flash-text {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

.night-warning {
  background: rgba(50, 50, 100, 0.8);
  border: 1px solid rgba(100, 100, 200, 0.5);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 15px;
  text-align: center;
  color: #a0c4ff;
  font-size: 14px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 15px 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-btn:hover:not(.disabled) {
  transform: translateY(-3px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.action-btn:active:not(.disabled) {
  transform: translateY(-1px);
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.fire-btn:not(.disabled) {
  border-color: rgba(255, 100, 50, 0.6);
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.3), rgba(255, 50, 0, 0.1));
}

.fire-btn:hover:not(.disabled) {
  box-shadow: 0 5px 20px rgba(255, 100, 50, 0.4);
}

.food-btn:not(.disabled) {
  border-color: rgba(50, 200, 100, 0.6);
  background: linear-gradient(135deg, rgba(50, 200, 100, 0.3), rgba(0, 150, 50, 0.1));
}

.food-btn:hover:not(.disabled) {
  box-shadow: 0 5px 20px rgba(50, 200, 100, 0.4);
}

.btn-icon {
  font-size: 28px;
}

.btn-text {
  font-size: 14px;
  font-weight: bold;
}

.btn-cost {
  font-size: 11px;
  color: rgba(255, 150, 150, 0.9);
}

.btn-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
