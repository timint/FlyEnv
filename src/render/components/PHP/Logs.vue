<template>
  <el-drawer
    v-model="show"
    size="75%"
    :destroy-on-close="true"
    :with-header="false"
    :close-on-click-modal="false"
    @closed="closedFn"
  >
    <div class="host-vhost">
      <div class="nav pl-3 pr-5">
        <div class="left" @click="close">
          <yb-icon :svg="import('@/svg/delete.svg?raw')" class="top-back-icon" />
          <span class="ml-3">{{ title }}</span>
        </div>
      </div>
      <div class="main-wapper">
        <LogVM ref="log" :log-file="filepath" />
      </div>
      <ToolVM :log="log" />
    </div>
  </el-drawer>
</template>
<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { I18nT } from '@lang/index'
  import { AsyncComponentSetup } from '@/util/AsyncComponent'
  import LogVM from '@/components/Log/index.vue'
  import ToolVM from '@/components/Log/tool.vue'
  import type { SoftInstalled } from '@/store/brew'
  import { join } from '@/util/path-browserify'

  const { show, onClosed, onSubmit, closedFn } = AsyncComponentSetup()

  const props = defineProps<{
    type: string
    version: SoftInstalled
  }>()

  const log = ref()

  const title = computed(() => {
    return props.type === 'php-fpm-slow' ? I18nT('base.performanceLog') : I18nT('php.fpmLog')
  })

  const filepath = computed(() => {
    return join(window.Server.PhpDir, `${props.version.num}`, `var/log/${props.type}.log`)
  })

  const close = () => {
    show.value = false
  }

  defineExpose({
    show,
    onSubmit,
    onClosed
  })
</script>
