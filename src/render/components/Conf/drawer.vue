<template>
  <div class="main-wapper">
    <div v-show="type === 'default'" ref="input" class="block"></div>
    <template v-if="showCommond">
      <el-scrollbar v-if="type === 'common'" class="p-2">
        <slot name="common"></slot>
      </el-scrollbar>
    </template>
  </div>
  <div class="tool gap-3">
    <el-radio-group v-if="showCommond" v-model="type" size="small">
      <el-tooltip :show-after="600" :content="I18nT('conf.rawFile')" placement="top">
        <el-radio-button value="default">
          <Document class="w-5 h-5 p-0.5" />
        </el-radio-button>
      </el-tooltip>
      <el-tooltip :show-after="600" :content="I18nT('conf.commonSettings')" placement="top">
        <el-radio-button value="common">
          <Operation class="w-5 h-5 p-0.5" />
        </el-radio-button>
      </el-tooltip>
    </el-radio-group>
    <el-button-group>
      <el-tooltip :show-after="600" :content="I18nT('conf.open')" placement="top">
        <el-button :disabled="disabled" @click="openConfig">
          <FolderOpened class="w-5 h-5 p-0.5" />
        </el-button>
      </el-tooltip>
      <el-tooltip :show-after="600" :content="I18nT('conf.save')" placement="top">
        <el-button :disabled="disabled" @click="saveConfig">
          <el-badge is-dot :offset="[8, 1]" :hidden="!changed">
            <yb-icon :svg="import('@/svg/save.svg?raw')" class="w-5 h-5 p-0.5" />
          </el-badge>
        </el-button>
      </el-tooltip>
      <el-tooltip
        v-if="showLoadDefault !== false"
        :show-after="600"
        :content="I18nT('conf.loadDefault')"
        placement="top"
      >
        <el-button :disabled="disabled || defaultDisabled" @click="getDefault">
          <yb-icon :svg="import('@/svg/load-default.svg?raw')" class="w-5 h-5" />
        </el-button>
      </el-tooltip>
    </el-button-group>
    <el-button-group>
      <el-tooltip :show-after="600" :content="I18nT('load.loadCustomFile')" placement="top">
        <el-button :disabled="disabled" @click="loadCustomFile">
          <yb-icon :svg="import('@/svg/custom.svg?raw')" class="w-5 h-5 p-0.5" />
        </el-button>
      </el-tooltip>
      <el-tooltip :show-after="600" :content="I18nT('load.saveCustomFile')" placement="top">
        <el-button :disabled="disabled" @click="saveCustomFile">
          <yb-icon :svg="import('@/svg/saveas.svg?raw')" class="w-5 h-5 p-0.5" />
        </el-button>
      </el-tooltip>
    </el-button-group>
    <template v-if="!!url">
      <el-tooltip :content="url" :show-after="600" placement="top">
        <el-button @click="openURL(url)">
          <yb-icon :svg="import('@/svg/http.svg?raw')" class="w-5 h-5" />
        </el-button>
      </el-tooltip>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'
  import { Document, Operation, FolderOpened } from '@element-plus/icons-vue'
  import type { AllAppModule } from '@/core/type'
  import { ConfSetup } from '@/components/Conf/setup'
  import { I18nT } from '@lang/index'

  const props = withDefaults(
    defineProps<{
      file: string
      defaultFile?: string
      defaultConf?: string
      fileExt: string
      typeFlag: AllAppModule
      showCommond: boolean
      url?: string
      showLoadDefault?: boolean
    }>(),
    {
      showLoadDefault: true
    }
  )

  const emit = defineEmits(['onTypeChange'])

  const p = computed(() => {
    return {
      file: props.file,
      defaultFile: props.defaultFile,
      defaultConf: props.defaultConf,
      fileExt: props.fileExt,
      typeFlag: props.typeFlag,
      showCommond: props.showCommond
    }
  })

  const {
    changed,
    update,
    input,
    type,
    disabled,
    defaultDisabled,
    getDefault,
    saveConfig,
    saveCustom,
    openConfig,
    loadCustom,
    getEditValue,
    setEditValue,
    openURL,
    watchFlag
  } = ConfSetup(p)

  watch(
    watchFlag,
    () => {
      if (!disabled.value && type.value === 'common') {
        emit('onTypeChange', type.value, getEditValue())
      }
    },
    {
      immediate: true
    }
  )

  defineExpose({
    setEditValue,
    update
  })
</script>
