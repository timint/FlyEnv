<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service
        v-if="tab === 0"
        title="Erlang"
        type-flag="erlang"
        :fetch-data-when-create="true"
      ></Service>
      <Manager
        v-else-if="tab === 1"
        type-flag="erlang"
        :has-static="false"
        title="Erlang"
        url="https://github.com/erlang/otp/releases/"
      ></Manager>
      <ProjectIndex
        v-else-if="tab === 2"
        :title="I18nT('host.erlangProjects')"
        :type-flag="'erlang'"
      >
      </ProjectIndex>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '@/components/ServiceManager/base.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'
  import ProjectIndex from '@/components/LanguageProjects/index.vue'

  const { tab } = AppModuleSetup('erlang')
  const tabs = [
    I18nT('base.installed'),
    I18nT('base.available'),
    I18nT('host.erlangProjects')
  ]
</script>
