import type BaseTask from '@/components/AI/Task/BaseTask'
import type { AIChatItem } from '@shared/app'

import { defineStore } from 'pinia'

interface State {
  show: boolean
  chatList: Array<AIChatItem>
  currentTask?: BaseTask
}

const state: State = {
  show: false,
  chatList: [],
  currentTask: undefined
}

export const AIStore = defineStore('ai', {
  state: (): State => state,
  getters: {},
  actions: {}
})
