<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service v-if="tab === 0"></Service>
      <Manager v-else-if="tab === 1" type-flag="pure-ftpd" title="Pure-FTPd"></Manager>
      <Config v-if="tab === 2"></Config>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from './Service.vue'
  import Config from './Config.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'

  const { tab, checkVersion } = AppModuleSetup('pure-ftpd')
  const tabs = [I18nT('base.installed'), I18nT('base.available'), I18nT('base.configuration')]
  checkVersion()
</script>
