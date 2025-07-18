<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service v-if="tab === 0" type-flag="rabbitmq" title="RabbitMQ">
        <template v-if="isRun" #tool-left>
          <el-button style="color: #01cc74" class="button" link @click="openURL">
            <yb-icon
              style="width: 20px; height: 20px; margin-left: 10px"
              :svg="import('@/svg/http.svg?raw')"
            ></yb-icon>
          </el-button>
        </template>
      </Service>
      <Manager
        v-else-if="tab === 1"
        :has-static="false"
        :show-brew-lib="true"
        :show-port-lib="true"
        type-flag="rabbitmq"
        title="RabbitMQ"
      ></Manager>
      <Config v-if="tab === 2"></Config>
      <Logs v-if="tab === 3"></Logs>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import Service from '../ServiceManager/index.vue'
  import Config from './Config.vue'
  import Logs from './Logs.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'
  import { AppStore } from '@/store/app'
  import { BrewStore } from '@/store/brew'
  import { shell } from '@/util/NodeFn'

  const appStore = AppStore()
  const brewStore = BrewStore()

  const currentVersion = computed(() => {
    const current = appStore.config.server?.rabbitmq?.current
    const installed = brewStore.module('rabbitmq').installed
    return installed?.find((i) => i.path === current?.path && i.version === current?.version)
  })

  const isRun = computed(() => {
    return currentVersion?.value?.run
  })

  const openURL = () => {
    shell.openExternal('http://localhost:15672/')
  }

  const { tab, checkVersion } = AppModuleSetup('rabbitmq')
  const tabs = [
    I18nT('base.installed'),
    I18nT('base.available'),
    I18nT('base.configuration'),
    I18nT('base.log')
  ]
  checkVersion()
</script>
