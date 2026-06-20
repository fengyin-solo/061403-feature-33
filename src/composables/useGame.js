import { ref, computed, onMounted, onUnmounted } from 'vue'

const COMBO_RECIPES = [
  {
    id: 'survival_instinct',
    name: '生存本能',
    icon: '🔥',
    sequence: ['chop', 'fire'],
    reward: { heat: 15 },
    description: '砍柴后立即生火，额外获得15热量'
  },
  {
    id: 'hunter_way',
    name: '猎人之道',
    icon: '🏹',
    sequence: ['craft', 'hunt'],
    reward: { huntBonus: 0.25 },
    description: '制作工具后立即狩猎，成功率额外+25%'
  },
  {
    id: 'feast',
    name: '丰盛晚餐',
    icon: '🍖',
    sequence: ['hunt', 'eat'],
    reward: { tempMultiplier: 2 },
    description: '狩猎后立即进食，体温恢复翻倍'
  },
  {
    id: 'diligent',
    name: '勤奋伐木',
    icon: '🪓',
    sequence: ['chop', 'chop', 'chop'],
    reward: { wood: 4 },
    description: '连续砍柴3次，额外获得4木头'
  },
  {
    id: 'perfect_camp',
    name: '完美营地',
    icon: '🏕️',
    sequence: ['chop', 'craft', 'hunt', 'fire'],
    reward: { heat: 20, wood: 2, food: 2, hide: 1, temp: 8 },
    description: '砍柴→制作→狩猎→生火，全资源大丰收！'
  }
]

const COMBO_TIMEOUT = 15000

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])

  const comboActions = ref([])
  const comboCount = ref(0)
  const lastComboTriggered = ref(null)
  const comboTimer = ref(null)

  const comboTip = computed(() => {
    const actions = comboActions.value
    if (actions.length === 0) return null
    for (const recipe of COMBO_RECIPES) {
      const seq = recipe.sequence
      if (actions.length < seq.length) {
        let match = true
        for (let i = 0; i < actions.length; i++) {
          if (actions[i] !== seq[i]) { match = false; break }
        }
        if (match) {
          const nextStep = seq[actions.length]
          const actionNames = { chop: '砍柴', hunt: '狩猎', craft: '制作工具', fire: '生火', eat: '进食' }
          return {
            recipeName: recipe.name,
            recipeIcon: recipe.icon,
            nextAction: actionNames[nextStep] || nextStep,
            progress: actions.length,
            total: seq.length,
            description: recipe.description
          }
        }
      }
    }
    return null
  })

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null
  let huntBonusFromCombo = 0

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15 + huntBonusFromCombo)

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function resetCombo() {
    comboActions.value = []
    comboCount.value = 0
    huntBonusFromCombo = 0
    if (comboTimer.value) {
      clearTimeout(comboTimer.value)
      comboTimer.value = null
    }
  }

  function pushComboAction(action) {
    comboActions.value.push(action)
    comboCount.value = comboActions.value.length
    if (comboTimer.value) clearTimeout(comboTimer.value)
    comboTimer.value = setTimeout(() => {
      resetCombo()
    }, COMBO_TIMEOUT)
  }

  function checkCombo(action) {
    const actions = [...comboActions.value, action]
    let triggered = null
    for (const recipe of COMBO_RECIPES) {
      const seq = recipe.sequence
      if (actions.length >= seq.length) {
        let match = true
        for (let i = 0; i < seq.length; i++) {
          if (actions[actions.length - seq.length + i] !== seq[i]) { match = false; break }
        }
        if (match) {
          triggered = recipe
          break
        }
      }
    }
    return triggered
  }

  function applyComboReward(recipe) {
    const r = recipe.reward
    let msg = `${recipe.icon} 组合奖励【${recipe.name}】触发！`
    const details = []

    if (r.heat) {
      heat.value = Math.min(100, heat.value + r.heat)
      details.push(`+${r.heat}热量`)
    }
    if (r.wood) {
      wood.value += r.wood
      details.push(`+${r.wood}木头`)
    }
    if (r.food) {
      food.value += r.food
      details.push(`+${r.food}食物`)
    }
    if (r.hide) {
      hide.value += r.hide
      details.push(`+${r.hide}兽皮`)
    }
    if (r.temp) {
      temperature.value = Math.min(100, temperature.value + r.temp)
      details.push(`+${r.temp}体温`)
    }
    if (r.huntBonus) {
      huntBonusFromCombo += r.huntBonus
      details.push(`狩猎成功率+${Math.round(r.huntBonus * 100)}%`)
    }
    if (r.tempMultiplier) {
      return r.tempMultiplier
    }

    if (details.length > 0) {
      msg += ' ' + details.join('，')
    }
    addLog(msg, 'combo')
    lastComboTriggered.value = { name: recipe.name, icon: recipe.icon }
    setTimeout(() => { lastComboTriggered.value = null }, 2000)

    return 1
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        temperature.value = Math.min(80, temperature.value + 1)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return

    const comboResult = checkCombo('chop')
    pushComboAction('chop')

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier

    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained

    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')

    if (comboResult) {
      applyComboReward(comboResult)
      if (comboResult.id === 'diligent' || comboResult.id === 'perfect_camp') {
        resetCombo()
      }
    }

    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }

    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return

    const comboResult = checkCombo('hunt')
    pushComboAction('hunt')

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier

    temperature.value = Math.max(0, temperature.value - tempCost)

    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }

    if (comboResult) {
      applyComboReward(comboResult)
      if (comboResult.id === 'perfect_camp') {
        resetCombo()
      }
    }

    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }

    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }

    const comboResult = checkCombo('craft')
    pushComboAction('craft')

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier

    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)

    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')

    if (comboResult) {
      applyComboReward(comboResult)
    }

    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }

    const comboResult = checkCombo('fire')
    pushComboAction('fire')

    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)

    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')

    if (comboResult) {
      applyComboReward(comboResult)
      resetCombo()
    }
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }

    const comboResult = checkCombo('eat')
    pushComboAction('eat')

    food.value -= 1
    const baseTempGained = Math.floor(Math.random() * 10) + 5
    const tempMultiplier = comboResult ? applyComboReward(comboResult) : 1
    const tempGained = Math.round(baseTempGained * tempMultiplier)
    temperature.value = Math.min(100, temperature.value + tempGained)

    if (tempMultiplier > 1) {
      addLog(`进食：体温恢复 ${tempGained}（组合加成×${tempMultiplier}）`, 'success')
      resetCombo()
    } else {
      addLog(`进食：体温恢复 ${tempGained}`, 'success')
    }
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    resetCombo()

    stopTimers()
    startTimers()

    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    comboCount,
    comboTip,
    lastComboTriggered,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame
  }
}
