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
        title="Java"
        type-flag="java"
        :fetch-data-when-create="true"
      ></Service>
      <Manager
        v-else-if="tab === 1"
        title="Java"
        url="https://learn.microsoft.com/en-us/java/openjdk/download"
        type-flag="java"
        :has-static="true"
      ></Manager>
      <Maven
        v-else-if="tab === 2"
        type-flag="maven"
        title="Maven"
        url="https://maven.apache.org/"
        :show-brew-lib="true"
        :has-static="true"
        :show-port-lib="true"
      />
      <ProjectIndex v-else-if="tab === 3" :title="I18nT('host.javaProjects')" :type-flag="'java'">
        <template #openin="{ row }">
          <li @click.stop="Project.openPath(row.path, 'IntelliJ')">
            <yb-icon :svg="import('@/svg/idea.svg?raw')" width="13" height="13" />
            <span class="ml-3">{{ I18nT('nodejs.openIN') }} IntelliJ IDEA</span>
          </li>
        </template>
      </ProjectIndex>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '@/components/ServiceManager/base.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'
  import Maven from '../VersionManager/all.vue'
  import ProjectIndex from '@/components/LanguageProjects/index.vue'
  import { Project } from '@/util/Project'

  const { tab } = AppModuleSetup('java')
  const tabs = [
    I18nT('base.installed'),
    I18nT('base.available'),
    'Maven',
    I18nT('host.javaProjects')
  ]
</script>
