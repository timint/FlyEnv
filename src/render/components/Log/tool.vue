<template>
  <div class="tool">
    <el-tooltip :show-after="600" :content="I18nT('base.open')" placement="top">
      <el-button class="shrink0" :disabled="log?.isDisabled()" @click="log?.logDo('open')">
        <FolderOpened class="w-5 h-5 p-0.5" style="margin-right: .5em;" />
        <span>{{ I18nT('base.openFolder') }}</span>
      </el-button>
    </el-tooltip>
    <el-tooltip :show-after="600" :content="I18nT('base.refresh')" placement="top">
      <el-button class="shrink0" :disabled="log?.isDisabled()" @click="log?.logDo('refresh')">
        <Refresh class="w-5 h-5 p-0.5" style="margin-right: .5em;" />
        <span>{{ I18nT('base.refresh') }}</span>
      </el-button>
    </el-tooltip>
    <el-tooltip :show-after="600" :content="I18nT('base.clean')" placement="top">
      <el-button class="shrink0" :disabled="log?.isDisabled()" @click="log?.logDo('clean')">
        <yb-icon :svg="import('@/svg/erase.svg?raw')" width="16" height="16" style="margin-right: .5em;" />
        <span>{{ I18nT('base.clear') }}</span>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script lang="ts" setup>
  import { I18nT } from '@lang/index'
  import { FolderOpened, Refresh, Notebook } from '@element-plus/icons-vue'

  defineProps<{
    log: any
  }>()
</script>
