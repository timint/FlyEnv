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
        title="Perl"
        type-flag="perl"
        :fetch-data-when-create="true"
      ></Service>
      <Manager
        v-else-if="tab === 1"
        type-flag="perl"
        title="Perl"
        url="https://github.com/StrawberryPerl/Perl-Dist-Strawberry/releases"
        :has-static="false"
        :show-port-lib="true"
        :show-brew-lib="true"
      ></Manager>
      <ProjectIndex
        v-else-if="tab === 2"
        :title="I18nT('host.perlProjects')"
        :type-flag="'perl'"
      ></ProjectIndex>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '@/components/ServiceManager/base.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'
  import ProjectIndex from '@/components/LanguageProjects/index.vue'

  const { tab } = AppModuleSetup('perl')
  const tabs = [I18nT('base.installed'), I18nT('base.library'), I18nT('host.perlProjects')]
</script>
