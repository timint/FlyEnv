<template>
  <el-popover
    ref="popper"
    effect="dark"
    popper-class="host-list-poper"
    placement="left-start"
    :show-arrow="false"
    width="auto"
    @before-enter="onBeforEnter"
    @show="onShow"
  >
    <ul v-poper-fix class="host-list-menu">
      <slot></slot>
      <li class="path-set" :class="state" @click.stop="doChange">
        <template v-if="loading">
          <el-button style="width: auto; height: auto" text :loading="true"></el-button>
        </template>
        <template v-else>
          <yb-icon
            class="current"
            :class="{
              'text-blue-500': isInAppEnv,
              'opacity-100': isInAppEnv
            }"
            :svg="import('@/svg/select.svg?raw')"
            width="17"
            height="17"
          />
        </template>
        <span class="ml-3">{{ I18nT('base.addToPath') }}</span>
      </li>
      <li @click.stop="doSetAlias">
        <yb-icon class="current" :svg="import('@/svg/aliase.svg?raw')" width="17" height="17" />
        <span class="ml-3">{{ I18nT('service.setAlias') }}</span>
      </li>
      <template v-if="isMacOS">
        <template v-if="type === 'postgresql'">
          <Extension :item="item" />
        </template>
      </template>
      <template v-if="isWindows">
        <li @click.stop="ServiceActionStore.delVersion(item, type)">
          <yb-icon :svg="import('@/svg/trash.svg?raw')" width="17" height="17" />
          <span class="ml-3">{{ I18nT('base.delete') }}</span>
        </li>
      </template>
    </ul>
    <template #reference>
      <el-button link class="status">
        <yb-icon :svg="import('@/svg/more1.svg?raw')" width="22" height="22" />
      </el-button>
    </template>
  </el-popover>
</template>
<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import type { SoftInstalled } from '@/store/brew'
  import { ServiceActionStore } from './store'
  import Extension from '@/components/ServiceManager/Pgsql/extension.vue'
  import { I18nT } from '@lang/index'
  import { dirname, join } from '@/util/path-browserify'

  const props = defineProps<{
    item: SoftInstalled
    type: string
  }>()

  const isMacOS = computed(() => {
    return window.Server.isMacOS
  })
  const isWindows = computed(() => {
    return window.Server.isWindows
  })
  const isLinux = computed(() => {
    return window.Server.isLinux
  })

  const popper = ref()

  const loading = computed(() => {
    return ServiceActionStore.pathSeting?.[props.item.bin] ?? false
  })

  const isInAppEnv = computed(() => {
    return ServiceActionStore.isInAppEnv(props.item)
  })

  const state = computed(() => {
    if (ServiceActionStore.allPath.length === 0) {
      return ''
    }
    let bin = dirname(props.item.bin)
    if (props.type === 'php') {
      bin = dirname(props.item?.phpBin ?? join(props.item.path, 'bin/php'))
    }
    console.log('bin: ', bin)
    if (ServiceActionStore.allPath.includes(bin)) {
      return 'seted'
    }
    return 'noset'
  })

  const onBeforEnter = () => {
    console.log('onBeforEnter !!!')
    ServiceActionStore.fetchPath()
  }

  const onShow = () => {
    console.log('onShow !!!')
  }

  const doSetAlias = () => {
    popper.value.hide()
    const item: SoftInstalled = props.item
    ServiceActionStore.showAlias(item)
  }

  const doChange = () => {
    ServiceActionStore.updatePath(props.item, props.type)
  }
</script>
